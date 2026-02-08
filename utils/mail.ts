import { unlinkSync } from "node:fs";
import { sanitizeForAppleScript, createSecureTempFile, runAppleScriptWithTimeout } from "./sanitize.ts";

// Configuration
const CONFIG = {
	// Maximum emails to process (to avoid performance issues)
	MAX_EMAILS: 20,
	// Maximum content length for previews
	MAX_CONTENT_PREVIEW: 300,
	// Timeout for operations
	TIMEOUT_MS: 30000,
};

interface EmailMessage {
	subject: string;
	sender: string;
	dateSent: string;
	content: string;
	isRead: boolean;
	mailbox: string;
}

// AppleScript handler to clean text fields (remove newlines/tabs for safe delimiter parsing)
const CLEAN_FIELD_HANDLER = `
on cleanField(theText)
	if theText is missing value then return ""
	set cleanedText to theText as text
	set {oldTID, AppleScript's text item delimiters} to {AppleScript's text item delimiters, return}
	set parts to text items of cleanedText
	set AppleScript's text item delimiters to " "
	set cleanedText to parts as text
	set AppleScript's text item delimiters to (ASCII character 10)
	set parts to text items of cleanedText
	set AppleScript's text item delimiters to " "
	set cleanedText to parts as text
	set AppleScript's text item delimiters to (ASCII character 9)
	set parts to text items of cleanedText
	set AppleScript's text item delimiters to " "
	set cleanedText to parts as text
	set AppleScript's text item delimiters to oldTID
	return cleanedText
end cleanField`;

/**
 * Parse tab-delimited email results from AppleScript
 * Format per line: subject\tsender\tdate\tcontent\tisRead\tmailbox
 */
function parseEmailResults(result: string): EmailMessage[] {
	if (!result || result.trim() === "") return [];
	const lines = result.split(/\r?\n/).filter(l => l.includes("\t"));
	return lines.map(line => {
		const fields = line.split("\t");
		return {
			subject: fields[0] || "No subject",
			sender: fields[1] || "Unknown",
			dateSent: fields[2] || "",
			content: fields[3] || "",
			isRead: fields[4] === "true",
			mailbox: fields[5] || "Unknown",
		};
	});
}

/**
 * Check if Mail app is accessible
 */
async function checkMailAccess(): Promise<boolean> {
	try {
		const script = `
tell application "Mail"
    return name
end tell`;

		await runAppleScriptWithTimeout(script, CONFIG.TIMEOUT_MS);
		return true;
	} catch (error) {
		console.error(
			`Cannot access Mail app: ${error instanceof Error ? error.message : String(error)}`,
		);
		return false;
	}
}

/**
 * Request Mail app access and provide instructions if not available
 */
async function requestMailAccess(): Promise<{ hasAccess: boolean; message: string }> {
	try {
		// First check if we already have access
		const hasAccess = await checkMailAccess();
		if (hasAccess) {
			return {
				hasAccess: true,
				message: "Mail access is already granted."
			};
		}

		// If no access, provide clear instructions
		return {
			hasAccess: false,
			message: "Mail access is required but not granted. Please:\n1. Open System Settings > Privacy & Security > Automation\n2. Find your terminal/app in the list and enable 'Mail'\n3. Make sure Mail app is running and configured with at least one account\n4. Restart your terminal and try again"
		};
	} catch (error) {
		return {
			hasAccess: false,
			message: `Error checking Mail access: ${error instanceof Error ? error.message : String(error)}`
		};
	}
}

// Max recent messages to scan per mailbox (avoids timeouts on huge mailboxes)
const SCAN_PER_MAILBOX = 100;

/**
 * Get unread emails from Mail app.
 * By default checks only INBOX of each account (fast across many accounts).
 * When a specific mailbox is given, checks that mailbox instead.
 * Scans recent messages by index — never uses "whose" filters which time out.
 */
async function getUnreadMails(
	limit = 10,
	account?: string,
	mailbox?: string,
): Promise<EmailMessage[]> {
	try {
		const accessResult = await requestMailAccess();
		if (!accessResult.hasAccess) {
			throw new Error(accessResult.message);
		}

		const maxEmails = Math.min(limit, CONFIG.MAX_EMAILS);
		const targetMailbox = mailbox || "INBOX";

		const acctFilter = account
			? `set acctList to {first account whose name is "${sanitizeForAppleScript(account)}"}`
			: `set acctList to every account`;

		const script = `
tell application "Mail"
	set outputText to ""
	set emailCount to 0

	try
		${acctFilter}

		repeat with acct in acctList
			if emailCount >= ${maxEmails} then exit repeat

			try
				set acctName to name of acct

				-- Target specific mailbox directly (default: INBOX)
				set mb to mailbox "${sanitizeForAppleScript(targetMailbox)}" of acct

				-- Scan recent messages by index (no "count" or "whose" on large mailboxes)
				repeat with i from 1 to ${SCAN_PER_MAILBOX}
					if emailCount >= ${maxEmails} then exit repeat

					try
						set msg to message i of mb
						if read status of msg is false then
							set msgSubject to my cleanField(subject of msg)
							set msgSender to my cleanField(sender of msg)
							set msgDate to my cleanField((date sent of msg) as string)

							set msgContent to "[Content not available]"
							try
								set rawContent to content of msg
								if rawContent is not missing value then
									if (length of rawContent) > ${CONFIG.MAX_CONTENT_PREVIEW} then
										set rawContent to (text 1 thru ${CONFIG.MAX_CONTENT_PREVIEW} of rawContent) & "..."
									end if
									set msgContent to my cleanField(rawContent)
								end if
							end try

							set outputText to outputText & msgSubject & tab & msgSender & tab & msgDate & tab & msgContent & tab & "false" & tab & my cleanField(acctName & "/" & "${sanitizeForAppleScript(targetMailbox)}") & linefeed
							set emailCount to emailCount + 1
						end if
					on error errMsg
						-- Past end of messages or problematic message — move to next account
						exit repeat
					end try
				end repeat
			on error
				-- Skip accounts that don't have this mailbox
			end try
		end repeat
	on error errMsg
		return "ERROR:" & errMsg
	end try

	return outputText
end tell
${CLEAN_FIELD_HANDLER}`;

		const result = (await runAppleScriptWithTimeout(script, CONFIG.TIMEOUT_MS)) as string;

		if (result && result.startsWith("ERROR:")) {
			throw new Error(result.substring(6));
		}

		return parseEmailResults(result);
	} catch (error) {
		console.error(
			`Error getting unread emails: ${error instanceof Error ? error.message : String(error)}`,
		);
		return [];
	}
}

/**
 * Search for emails by search term
 */
async function searchMails(
	searchTerm: string,
	limit = 10,
): Promise<EmailMessage[]> {
	try {
		const accessResult = await requestMailAccess();
		if (!accessResult.hasAccess) {
			throw new Error(accessResult.message);
		}

		if (!searchTerm || searchTerm.trim() === "") {
			return [];
		}

		const maxEmails = Math.min(limit, CONFIG.MAX_EMAILS);
		const cleanSearchTerm = sanitizeForAppleScript(searchTerm);

		const script = `
tell application "Mail"
	set outputText to ""
	set emailCount to 0
	set searchTerm to "${cleanSearchTerm}"

	-- Search INBOX of each account by index, matching subject locally
	repeat with acct in accounts
		if emailCount >= ${maxEmails} then exit repeat

		try
			set acctName to name of acct
			set mb to mailbox "INBOX" of acct

			repeat with i from 1 to ${SCAN_PER_MAILBOX}
				if emailCount >= ${maxEmails} then exit repeat

				try
					set msg to message i of mb
					set msgSubject to subject of msg
					if msgSubject contains searchTerm then
						set cleanSubject to my cleanField(msgSubject)
						set msgSender to my cleanField(sender of msg)
						set msgDate to my cleanField((date sent of msg) as string)

						set isReadStr to "true"
						if read status of msg is false then set isReadStr to "false"

						set msgContent to "[Content not available]"
						try
							set rawContent to content of msg
							if rawContent is not missing value then
								if (length of rawContent) > ${CONFIG.MAX_CONTENT_PREVIEW} then
									set rawContent to (text 1 thru ${CONFIG.MAX_CONTENT_PREVIEW} of rawContent) & "..."
								end if
								set msgContent to my cleanField(rawContent)
							end if
						end try

						set outputText to outputText & cleanSubject & tab & msgSender & tab & msgDate & tab & msgContent & tab & isReadStr & tab & my cleanField(acctName & "/INBOX") & linefeed
						set emailCount to emailCount + 1
					end if
				on error
					-- Past end of messages — move to next account
					exit repeat
				end try
			end repeat
		on error
			-- Skip accounts without INBOX
		end try
	end repeat

	return outputText
end tell
${CLEAN_FIELD_HANDLER}`;

		const result = (await runAppleScriptWithTimeout(script, CONFIG.TIMEOUT_MS)) as string;
		return parseEmailResults(result);
	} catch (error) {
		console.error(
			`Error searching emails: ${error instanceof Error ? error.message : String(error)}`,
		);
		return [];
	}
}

/**
 * Send an email
 */
async function sendMail(
	to: string,
	subject: string,
	body: string,
	cc?: string,
	bcc?: string,
): Promise<string | undefined> {
	try {
		const accessResult = await requestMailAccess();
		if (!accessResult.hasAccess) {
			throw new Error(accessResult.message);
		}

		// Validate inputs
		if (!to || !to.trim()) {
			throw new Error("To address is required");
		}
		if (!subject || !subject.trim()) {
			throw new Error("Subject is required");
		}
		if (!body || !body.trim()) {
			throw new Error("Email body is required");
		}

		// Use file-based approach for email body to avoid AppleScript escaping issues
		const tmpFile = createSecureTempFile("email-body", body.trim());

		const script = `
tell application "Mail"
    activate

    -- Read email body from file to preserve formatting
    set emailBody to read file POSIX file "${tmpFile}" as «class utf8»

    -- Create new message
    set newMessage to make new outgoing message with properties {subject:"${sanitizeForAppleScript(subject)}", content:emailBody, visible:true}

    tell newMessage
        make new to recipient with properties {address:"${sanitizeForAppleScript(to)}"}
        ${cc ? `make new cc recipient with properties {address:"${sanitizeForAppleScript(cc)}"}` : ""}
        ${bcc ? `make new bcc recipient with properties {address:"${sanitizeForAppleScript(bcc)}"}` : ""}
    end tell

    send newMessage
    return "SUCCESS"
end tell`;

		const result = (await runAppleScriptWithTimeout(script, CONFIG.TIMEOUT_MS)) as string;

		// Clean up temporary file
		try {
			unlinkSync(tmpFile);
		} catch (e) {
			// Ignore cleanup errors
		}

		if (result === "SUCCESS") {
			return `Email sent to ${to} with subject "${subject}"`;
		} else {
			throw new Error("Failed to send email");
		}
	} catch (error) {
		console.error(
			`Error sending email: ${error instanceof Error ? error.message : String(error)}`,
		);
		throw new Error(
			`Error sending email: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Get list of mailboxes
 */
async function getMailboxes(): Promise<string[]> {
	try {
		const accessResult = await requestMailAccess();
		if (!accessResult.hasAccess) {
			throw new Error(accessResult.message);
		}

		const script = `
tell application "Mail"
	set boxNames to {}

	-- Include mailboxes from all accounts
	repeat with acct in accounts
		try
			set acctName to name of acct
			repeat with mb in mailboxes of acct
				try
					set end of boxNames to acctName & "/" & name of mb
				end try
			end repeat
		end try
	end repeat

	set {oldTID, AppleScript's text item delimiters} to {AppleScript's text item delimiters, linefeed}
	set outputText to boxNames as text
	set AppleScript's text item delimiters to oldTID
	return outputText
end tell`;

		const result = (await runAppleScriptWithTimeout(script, CONFIG.TIMEOUT_MS)) as string;

		if (result && result.trim()) {
			return result.split(/\r?\n/).filter(name => name.trim() !== "");
		}

		return [];
	} catch (error) {
		console.error(
			`Error getting mailboxes: ${error instanceof Error ? error.message : String(error)}`,
		);
		return [];
	}
}

/**
 * Get list of email accounts
 */
async function getAccounts(): Promise<string[]> {
	try {
		const accessResult = await requestMailAccess();
		if (!accessResult.hasAccess) {
			throw new Error(accessResult.message);
		}

		const script = `
tell application "Mail"
	set acctNames to {}
	repeat with acct in accounts
		try
			set end of acctNames to name of acct
		end try
	end repeat

	set {oldTID, AppleScript's text item delimiters} to {AppleScript's text item delimiters, linefeed}
	set outputText to acctNames as text
	set AppleScript's text item delimiters to oldTID
	return outputText
end tell`;

		const result = (await runAppleScriptWithTimeout(script, CONFIG.TIMEOUT_MS)) as string;

		if (result && result.trim()) {
			return result.split(/\r?\n/).filter(name => name.trim() !== "");
		}

		return [];
	} catch (error) {
		console.error(
			`Error getting accounts: ${error instanceof Error ? error.message : String(error)}`,
		);
		return [];
	}
}

/**
 * Get mailboxes for a specific account
 */
async function getMailboxesForAccount(accountName: string): Promise<string[]> {
	try {
		const accessResult = await requestMailAccess();
		if (!accessResult.hasAccess) {
			throw new Error(accessResult.message);
		}

		if (!accountName || !accountName.trim()) {
			return [];
		}

		const script = `
tell application "Mail"
	set boxNames to {}

	try
		set targetAccount to first account whose name is "${sanitizeForAppleScript(accountName)}"
		set accountMailboxes to mailboxes of targetAccount

		repeat with mb in accountMailboxes
			try
				set end of boxNames to name of mb
			end try
		end repeat
	on error
		return ""
	end try

	set {oldTID, AppleScript's text item delimiters} to {AppleScript's text item delimiters, linefeed}
	set outputText to boxNames as text
	set AppleScript's text item delimiters to oldTID
	return outputText
end tell`;

		const result = (await runAppleScriptWithTimeout(script, CONFIG.TIMEOUT_MS)) as string;

		if (result && result.trim()) {
			return result.split(/\r?\n/).filter(name => name.trim() !== "");
		}

		return [];
	} catch (error) {
		console.error(
			`Error getting mailboxes for account: ${error instanceof Error ? error.message : String(error)}`,
		);
		return [];
	}
}

/**
 * Get latest emails from a specific account
 */
async function getLatestMails(
	account: string,
	limit = 5,
): Promise<EmailMessage[]> {
	try {
		const accessResult = await requestMailAccess();
		if (!accessResult.hasAccess) {
			throw new Error(accessResult.message);
		}

		const maxEmails = Math.min(limit, CONFIG.MAX_EMAILS);

		const script = `
tell application "Mail"
	set outputText to ""
	set emailCount to 0

	try
		set targetAccount to first account whose name is "${sanitizeForAppleScript(account)}"
		set mb to mailbox "INBOX" of targetAccount

		-- Scan recent messages by index (no "count" or "whose")
		repeat with i from 1 to ${SCAN_PER_MAILBOX}
			if emailCount >= ${maxEmails} then exit repeat

			try
				set msg to message i of mb
				set msgSubject to my cleanField(subject of msg)
				set msgSender to my cleanField(sender of msg)
				set msgDate to my cleanField((date sent of msg) as string)

				set isReadStr to "true"
				if read status of msg is false then set isReadStr to "false"

				set msgContent to "[Content not available]"
				try
					set rawContent to content of msg
					if rawContent is not missing value then
						if (length of rawContent) > ${CONFIG.MAX_CONTENT_PREVIEW} then
							set rawContent to (text 1 thru ${CONFIG.MAX_CONTENT_PREVIEW} of rawContent) & "..."
						end if
						set msgContent to my cleanField(rawContent)
					end if
				end try

				set outputText to outputText & msgSubject & tab & msgSender & tab & msgDate & tab & msgContent & tab & isReadStr & tab & "INBOX" & linefeed
				set emailCount to emailCount + 1
			on error
				-- Past end of messages
				exit repeat
			end try
		end repeat
	on error errMsg
		return "ERROR:" & errMsg
	end try

	return outputText
end tell
${CLEAN_FIELD_HANDLER}`;

		const result = (await runAppleScriptWithTimeout(script, CONFIG.TIMEOUT_MS)) as string;

		if (result && result.startsWith("ERROR:")) {
			throw new Error(result.substring(6));
		}

		return parseEmailResults(result);
	} catch (error) {
		console.error("Error getting latest emails:", error);
		return [];
	}
}

export default {
	getUnreadMails,
	searchMails,
	sendMail,
	getMailboxes,
	getAccounts,
	getMailboxesForAccount,
	getLatestMails,
	requestMailAccess,
};
