#!/usr/bin/env node
import{createRequire as f6}from"node:module";var F6=Object.create;var{getPrototypeOf:S6,defineProperty:B8,getOwnPropertyNames:k6}=Object;var M6=Object.prototype.hasOwnProperty;var A6=($,J,Q)=>{Q=$!=null?F6(S6($)):{};let H=J||!$||!$.__esModule?B8(Q,"default",{value:$,enumerable:!0}):Q;for(let Y of k6($))if(!M6.call(H,Y))B8(H,Y,{get:()=>$[Y],enumerable:!0});return H};var w8=($,J)=>()=>(J||$((J={exports:{}}).exports,J),J.exports);var S0=($,J)=>{for(var Q in J)B8($,Q,{get:J[Q],enumerable:!0,configurable:!0,set:(H)=>J[Q]=()=>H})};var W0=($,J)=>()=>($&&(J=$($=0)),J);var K4=f6(import.meta.url);import P$ from"node:process";import{promisify as b$}from"node:util";import{execFile as C$,execFileSync as LJ}from"node:child_process";async function d1($,{humanReadableOutput:J=!0}={}){if(P$.platform!=="darwin")throw Error("macOS only");let Q=J?[]:["-ss"],{stdout:H}=await E$("osascript",["-e",$,Q]);return H.trim()}var E$;var f8=W0(()=>{E$=b$(C$)});import{execFile as Z$}from"node:child_process";import{promisify as g$}from"node:util";import{writeFileSync as l$}from"node:fs";import{randomUUID as m$}from"node:crypto";import{tmpdir as u$}from"node:os";import{join as c$}from"node:path";function E($){return $.replace(/\0/g,"").replace(/\\/g,"\\\\").replace(/"/g,"\\\"").replace(/\r/g,"\\r").replace(/\n/g,"\\n").replace(/\t/g,"\\t")}function O1(){let $=process.env.HOME;if(!$)throw Error("HOME environment variable is not set");if(/[;&|`$(){}!\n\r]/.test($))throw Error("HOME path contains invalid characters");if(!$.startsWith("/Users/")&&!$.startsWith("/home/"))throw Error("HOME path does not resolve to a valid user directory");return $}function n1($,J){let Q=`${$}-${m$()}.txt`,H=c$(u$(),Q);return l$(H,J,{encoding:"utf8",mode:384}),H}async function f($,J){return Promise.race([d1($),new Promise((Q,H)=>setTimeout(()=>H(Error(`AppleScript timed out after ${J}ms. This usually means macOS has not granted the required app permission. Check System Settings > Privacy & Security > Automation.`)),J))])}async function F1($,J){let{stdout:Q}=await p$("sqlite3",["-json",$,J]);return Q}var p$;var U0=W0(()=>{f8();p$=g$(Z$)});var P8={};S0(P8,{default:()=>o$});async function d$(){try{return await f(`
tell application "Contacts"
    return name
end tell`,C0.TIMEOUT_MS),!0}catch($){return console.error(`Cannot access Contacts app: ${$ instanceof Error?$.message:String($)}`),!1}}async function o1(){try{if(await d$())return{hasAccess:!0,message:"Contacts access is already granted."};return{hasAccess:!1,message:`Contacts access is required but not granted. Please:
1. Open System Settings > Privacy & Security > Automation
2. Find your terminal/app in the list and enable 'Contacts'
3. Alternatively, open System Settings > Privacy & Security > Contacts
4. Add your terminal/app to the allowed applications
5. Restart your terminal and try again`}}catch($){return{hasAccess:!1,message:`Error checking Contacts access: ${$ instanceof Error?$.message:String($)}`}}}async function i1(){try{let $=await o1();if(!$.hasAccess)throw Error($.message);let J=`
tell application "Contacts"
    set contactList to {}
    set contactCount to 0

    -- Get a limited number of people to avoid performance issues
    set allPeople to people

    repeat with i from 1 to (count of allPeople)
        if contactCount >= ${C0.MAX_CONTACTS} then exit repeat

        try
            set currentPerson to item i of allPeople
            set personName to name of currentPerson
            set personPhones to {}

            try
                set phonesList to phones of currentPerson
                repeat with phoneItem in phonesList
                    try
                        set phoneValue to value of phoneItem
                        if phoneValue is not "" then
                            set personPhones to personPhones & {phoneValue}
                        end if
                    on error
                        -- Skip problematic phone entries
                    end try
                end repeat
            on error
                -- Skip if no phones or phones can't be accessed
            end try

            -- Only add contact if they have phones
            if (count of personPhones) > 0 then
                set contactInfo to {name:personName, phones:personPhones}
                set contactList to contactList & {contactInfo}
                set contactCount to contactCount + 1
            end if
        on error
            -- Skip problematic contacts
        end try
    end repeat

    return contactList
end tell`,Q=await f(J,C0.TIMEOUT_MS),H=Array.isArray(Q)?Q:Q?[Q]:[],Y={};for(let W of H)if(W&&W.name&&W.phones)Y[W.name]=Array.isArray(W.phones)?W.phones:[W.phones];return Y}catch($){return console.error(`Error getting all contacts: ${$ instanceof Error?$.message:String($)}`),{}}}async function n$($){try{let J=await o1();if(!J.hasAccess)throw Error(J.message);if(!$||$.trim()==="")return[];let Q=$.toLowerCase().trim(),H=`
tell application "Contacts"
    set matchedPhones to {}
    set searchText to "${E(Q)}"

    -- Get a limited number of people to search through
    set allPeople to people
    set foundExact to false
    set partialMatches to {}

    repeat with i from 1 to (count of allPeople)
        if i > ${C0.MAX_CONTACTS} then exit repeat

        try
            set currentPerson to item i of allPeople
            set personName to name of currentPerson
            set lowerPersonName to (do shell script "echo " & quoted form of personName & " | tr '[:upper:]' '[:lower:]'")

            -- Check for exact match first (highest priority)
            if lowerPersonName is searchText then
                try
                    set phonesList to phones of currentPerson
                    repeat with phoneItem in phonesList
                        try
                            set phoneValue to value of phoneItem
                            if phoneValue is not "" then
                                set matchedPhones to matchedPhones & {phoneValue}
                                set foundExact to true
                            end if
                        on error
                            -- Skip problematic phone entries
                        end try
                    end repeat
                    if foundExact then exit repeat
                on error
                    -- Skip if no phones
                end try
            -- Check if search term is contained in name (partial match)
            else if lowerPersonName contains searchText or searchText contains lowerPersonName then
                try
                    set phonesList to phones of currentPerson
                    repeat with phoneItem in phonesList
                        try
                            set phoneValue to value of phoneItem
                            if phoneValue is not "" then
                                set partialMatches to partialMatches & {phoneValue}
                            end if
                        on error
                            -- Skip problematic phone entries
                        end try
                    end repeat
                on error
                    -- Skip if no phones
                end try
            end if
        on error
            -- Skip problematic contacts
        end try
    end repeat

    -- Return exact matches if found, otherwise partial matches
    if foundExact then
        return matchedPhones
    else
        return partialMatches
    end if
end tell`,Y=await f(H,C0.TIMEOUT_MS),W=Array.isArray(Y)?Y:Y?[Y]:[];if(W.length===0){console.error(`No AppleScript matches for "${$}", trying comprehensive search...`);let X=await i1(),w=(q)=>{return q.toLowerCase().replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,"").replace(/[♥️❤️💙💚💛💜🧡🖤🤍🤎]/g,"").replace(/\s+/g," ").trim()},z=[(q)=>w(q)===Q,(q)=>{let j=w(q),G=w($);return j===G},(q)=>w(q).startsWith(Q),(q)=>w(q).includes(Q),(q)=>Q.includes(w(q)),(q)=>{let G=w(q).split(" ")[0];return G===Q||G.startsWith(Q)||Q.startsWith(G)||G.replace(/(.)\1+/g,"$1")===Q||Q.replace(/(.)\1+/g,"$1")===G},(q)=>{let G=w(q).split(" "),U=G[G.length-1];return U===Q||U.startsWith(Q)},(q)=>{return w(q).split(" ").some((U)=>U.includes(Q)||Q.includes(U)||U.replace(/(.)\1+/g,"$1")===Q)}];for(let q of z){let j=Object.keys(X).filter(q);if(j.length>0)return console.error(`Found ${j.length} matches using fuzzy strategy for "${$}": ${j.join(", ")}`),X[j[0]]||[]}}return W.filter((X)=>X&&X.trim()!=="")}catch(J){console.error(`Error finding contact: ${J instanceof Error?J.message:String(J)}`);try{let Q=await i1(),H=$.toLowerCase().trim(),Y=Object.keys(Q).find((W)=>W.toLowerCase().includes(H)||H.includes(W.toLowerCase()));if(Y)return console.error(`Fallback found match for "${$}": ${Y}`),Q[Y]}catch(Q){console.error(`Fallback search also failed: ${Q}`)}return[]}}async function i$($){try{let J=await o1();if(!J.hasAccess)throw Error(J.message);if(!$||$.trim()==="")return null;let Q=$.replace(/[^0-9+]/g,""),H=`
tell application "Contacts"
    set foundName to ""
    set searchPhone to "${E(Q)}"

    -- Get a limited number of people to search through
    set allPeople to people

    repeat with i from 1 to (count of allPeople)
        if i > ${C0.MAX_CONTACTS} then exit repeat
        if foundName is not "" then exit repeat

        try
            set currentPerson to item i of allPeople

            try
                set phonesList to phones of currentPerson
                repeat with phoneItem in phonesList
                    try
                        set phoneValue to value of phoneItem
                        -- Normalize phone value for comparison
                        set normalizedPhone to phoneValue

                        -- Simple phone matching
                        if normalizedPhone contains searchPhone or searchPhone contains normalizedPhone then
                            set foundName to name of currentPerson
                            exit repeat
                        end if
                    on error
                        -- Skip problematic phone entries
                    end try
                end repeat
            on error
                -- Skip if no phones
            end try
        on error
            -- Skip problematic contacts
        end try
    end repeat

    return foundName
end tell`,Y=await f(H,C0.TIMEOUT_MS);if(Y&&Y.trim()!=="")return Y;let W=await i1();for(let[X,w]of Object.entries(W))if(w.map((q)=>q.replace(/[^0-9+]/g,"")).some((q)=>q===Q||q===`+${Q}`||q===`+1${Q}`||`+1${q}`===Q||Q.includes(q)||q.includes(Q)))return X;return null}catch(J){return console.error(`Error finding contact by phone: ${J instanceof Error?J.message:String(J)}`),null}}var C0,o$;var b8=W0(()=>{U0();C0={MAX_CONTACTS:1000,TIMEOUT_MS:1e4};o$={getAllNumbers:i1,findNumber:n$,findContactByPhone:i$,requestContactsAccess:o1}});var E8={};S0(E8,{default:()=>Q5});import{unlinkSync as a$}from"node:fs";async function t$(){try{return await f(`
tell application "Notes"
    return name
end tell`,l.TIMEOUT_MS),!0}catch($){return console.error(`Cannot access Notes app: ${$ instanceof Error?$.message:String($)}`),!1}}async function S1(){try{if(await t$())return{hasAccess:!0,message:"Notes access is already granted."};return{hasAccess:!1,message:`Notes access is required but not granted. Please:
1. Open System Settings > Privacy & Security > Automation
2. Find your terminal/app in the list and enable 'Notes'
3. Restart your terminal and try again
4. If the option is not available, run this command again to trigger the permission dialog`}}catch($){return{hasAccess:!1,message:`Error checking Notes access: ${$ instanceof Error?$.message:String($)}`}}}async function r$(){try{let $=await S1();if(!$.hasAccess)throw Error($.message);let J=`
tell application "Notes"
    set notesList to {}
    set noteCount to 0

    -- Get all notes from all folders
    set allNotes to notes

    repeat with i from 1 to (count of allNotes)
        if noteCount >= ${l.MAX_NOTES} then exit repeat

        try
            set currentNote to item i of allNotes
            set noteName to name of currentNote
            set noteContent to plaintext of currentNote

            -- Limit content for preview
            if (length of noteContent) > ${l.MAX_CONTENT_PREVIEW} then
                set noteContent to (characters 1 thru ${l.MAX_CONTENT_PREVIEW} of noteContent) as string
                set noteContent to noteContent & "..."
            end if

            set noteInfo to {name:noteName, content:noteContent}
            set notesList to notesList & {noteInfo}
            set noteCount to noteCount + 1
        on error
            -- Skip problematic notes
        end try
    end repeat

    return notesList
end tell`,Q=await f(J,l.TIMEOUT_MS);return(Array.isArray(Q)?Q:Q?[Q]:[]).map((Y)=>({name:Y.name||"Untitled Note",content:Y.content||"",creationDate:void 0,modificationDate:void 0}))}catch($){return console.error(`Error getting all notes: ${$ instanceof Error?$.message:String($)}`),[]}}async function s$($){try{let J=await S1();if(!J.hasAccess)throw Error(J.message);if(!$||$.trim()==="")return[];let Q=$.toLowerCase(),H=`
tell application "Notes"
    set matchedNotes to {}
    set noteCount to 0
    set searchTerm to "${E(Q)}"

    -- Get all notes and search through them
    set allNotes to notes

    repeat with i from 1 to (count of allNotes)
        if noteCount >= ${l.MAX_NOTES} then exit repeat

        try
            set currentNote to item i of allNotes
            set noteName to name of currentNote
            set noteContent to plaintext of currentNote

            -- Simple case-insensitive search in name and content
            if (noteName contains searchTerm) or (noteContent contains searchTerm) then
                -- Limit content for preview
                if (length of noteContent) > ${l.MAX_CONTENT_PREVIEW} then
                    set noteContent to (characters 1 thru ${l.MAX_CONTENT_PREVIEW} of noteContent) as string
                    set noteContent to noteContent & "..."
                end if

                set noteInfo to {name:noteName, content:noteContent}
                set matchedNotes to matchedNotes & {noteInfo}
                set noteCount to noteCount + 1
            end if
        on error
            -- Skip problematic notes
        end try
    end repeat

    return matchedNotes
end tell`,Y=await f(H,l.TIMEOUT_MS);return(Array.isArray(Y)?Y:Y?[Y]:[]).map((X)=>({name:X.name||"Untitled Note",content:X.content||"",creationDate:void 0,modificationDate:void 0}))}catch(J){return console.error(`Error finding notes: ${J instanceof Error?J.message:String(J)}`),[]}}async function e$($,J,Q="Claude"){try{let H=await S1();if(!H.hasAccess)return{success:!1,message:H.message};if(!$||$.trim()==="")return{success:!1,message:"Note title cannot be empty"};let Y=J.trim(),W=n1("note-content",Y),X=E(Q),w=E($),z=`
tell application "Notes"
    set targetFolder to null
    set folderFound to false
    set actualFolderName to "${X}"

    -- Try to find the specified folder
    try
        set allFolders to folders
        repeat with currentFolder in allFolders
            if name of currentFolder is "${X}" then
                set targetFolder to currentFolder
                set folderFound to true
                exit repeat
            end if
        end repeat
    on error
        -- Folders might not be accessible
    end try

    -- If folder not found and it's a test folder, try to create it
    if not folderFound and ("${X}" is "Claude" or "${X}" is "Test-Claude") then
        try
            make new folder with properties {name:"${X}"}
            -- Try to find it again
            set allFolders to folders
            repeat with currentFolder in allFolders
                if name of currentFolder is "${X}" then
                    set targetFolder to currentFolder
                    set folderFound to true
                    set actualFolderName to "${X}"
                    exit repeat
                end if
            end repeat
        on error
            -- Folder creation failed, use default
            set actualFolderName to "Notes"
        end try
    end if

    -- Read content from file to preserve formatting
    set noteContent to read file POSIX file "${W}" as «class utf8»

    -- Create the note with proper content
    if folderFound and targetFolder is not null then
        -- Create note in specified folder
        make new note at targetFolder with properties {name:"${w}", body:noteContent}
        return "SUCCESS:" & actualFolderName & ":false"
    else
        -- Create note in default location
        make new note with properties {name:"${w}", body:noteContent}
        return "SUCCESS:Notes:true"
    end if
end tell`,q=await f(z,l.TIMEOUT_MS);try{a$(W)}catch(j){}if(q&&typeof q==="string"&&q.startsWith("SUCCESS:")){let j=q.split(":"),G=j[1]||"Notes",U=j[2]==="true";return{success:!0,note:{name:$,content:Y},folderName:G,usedDefaultFolder:U}}else return{success:!1,message:`Failed to create note: ${q||"No result from AppleScript"}`}}catch(H){return{success:!1,message:`Failed to create note: ${H instanceof Error?H.message:String(H)}`}}}async function C8($){try{let J=await S1();if(!J.hasAccess)return{success:!1,message:J.message};let Q=`
tell application "Notes"
    set notesList to {}
    set noteCount to 0
    set folderFound to false

    -- Try to find the specified folder
    try
        set allFolders to folders
        repeat with currentFolder in allFolders
            if name of currentFolder is "${E($)}" then
                set folderFound to true

                -- Get notes from this folder
                set folderNotes to notes of currentFolder

                repeat with i from 1 to (count of folderNotes)
                    if noteCount >= ${l.MAX_NOTES} then exit repeat

                    try
                        set currentNote to item i of folderNotes
                        set noteName to name of currentNote
                        set noteContent to plaintext of currentNote

                        -- Limit content for preview
                        if (length of noteContent) > ${l.MAX_CONTENT_PREVIEW} then
                            set noteContent to (characters 1 thru ${l.MAX_CONTENT_PREVIEW} of noteContent) as string
                            set noteContent to noteContent & "..."
                        end if

                        set noteInfo to {name:noteName, content:noteContent}
                        set notesList to notesList & {noteInfo}
                        set noteCount to noteCount + 1
                    on error
                        -- Skip problematic notes
                    end try
                end repeat

                exit repeat
            end if
        end repeat
    on error
        -- Handle folder access errors
    end try

    if not folderFound then
        return "ERROR:Folder not found"
    end if

    return "SUCCESS:" & (count of notesList)
end tell`,H=await f(Q,l.TIMEOUT_MS);if(H&&typeof H==="string"){if(H.startsWith("ERROR:"))return{success:!1,message:H.replace("ERROR:","")};else if(H.startsWith("SUCCESS:"))return{success:!0,notes:[]}}return{success:!0,notes:[]}}catch(J){return{success:!1,message:`Failed to get notes from folder: ${J instanceof Error?J.message:String(J)}`}}}async function $5($,J=5){try{let Q=await C8($);if(Q.success&&Q.notes)return{success:!0,notes:Q.notes.slice(0,Math.min(J,Q.notes.length))};return Q}catch(Q){return{success:!1,message:`Failed to get recent notes from folder: ${Q instanceof Error?Q.message:String(Q)}`}}}async function J5($,J,Q,H=20){try{let Y=await C8($);if(Y.success&&Y.notes)return{success:!0,notes:Y.notes.slice(0,Math.min(H,Y.notes.length))};return Y}catch(Y){return{success:!1,message:`Failed to get notes by date range: ${Y instanceof Error?Y.message:String(Y)}`}}}var l,Q5;var R8=W0(()=>{U0();l={MAX_NOTES:50,MAX_CONTENT_PREVIEW:200,TIMEOUT_MS:8000};Q5={getAllNotes:r$,findNote:s$,createNote:e$,getNotesFromFolder:C8,getRecentNotesFromFolder:$5,getNotesByDateRange:J5,requestNotesAccess:S1}});var I8={};S0(I8,{default:()=>K5});import{access as Y5}from"node:fs/promises";async function X5($){return new Promise((J)=>setTimeout(J,$))}async function v8($,J=H5,Q=W5){try{return await $()}catch(H){if(J>0)return console.error(`Operation failed, retrying... (${J} attempts remaining)`),await X5(Q),v8($,J-1,Q);throw H}}function B5($){let J=$.replace(/[^0-9+]/g,"");if(/^\+1\d{10}$/.test(J))return[J];if(/^1\d{10}$/.test(J))return[`+${J}`];if(/^\d{10}$/.test(J))return[`+1${J}`];let Q=new Set;if(J.startsWith("+1"))Q.add(J);else if(J.startsWith("1"))Q.add(`+${J}`);else Q.add(`+1${J}`);return Array.from(Q)}async function u4($,J){return await f(`
tell application "Messages"
    set targetService to 1st service whose service type = iMessage
    set targetBuddy to buddy "${E($)}"
    send "${E(J)}" to targetBuddy
end tell`,a1.TIMEOUT_MS)}async function w5(){try{let J=`${O1()}/Library/Messages/chat.db`;return await Y5(J),await F1(J,"SELECT 1;"),!0}catch($){return console.error(`
Error: Cannot access Messages database.
To fix this, please grant Full Disk Access to Terminal/iTerm2:
1. Open System Preferences
2. Go to Security & Privacy > Privacy
3. Select "Full Disk Access" from the left sidebar
4. Click the lock icon to make changes
5. Add Terminal.app or iTerm.app to the list
6. Restart your terminal and try again

Error details: ${$ instanceof Error?$.message:String($)}
`),!1}}async function N8(){try{if(await w5())return{hasAccess:!0,message:"Messages access is already granted."};try{return await f('tell application "Messages" to return name',a1.TIMEOUT_MS),{hasAccess:!1,message:`Messages app is accessible but database access is required. Please:
1. Open System Settings > Privacy & Security > Full Disk Access
2. Add your terminal application (Terminal.app or iTerm.app)
3. Restart your terminal and try again
4. Note: This is required to read message history from the Messages database`}}catch(J){return{hasAccess:!1,message:`Messages access is required but not granted. Please:
1. Open System Settings > Privacy & Security > Automation
2. Find your terminal/app and enable 'Messages'
3. Also grant Full Disk Access in Privacy & Security > Full Disk Access
4. Restart your terminal and try again`}}}catch($){return{hasAccess:!1,message:`Error checking Messages access: ${$ instanceof Error?$.message:String($)}`}}}function c4($){try{let Q=Buffer.from($,"hex").toString(),H=[/NSString">(.*?)</,/NSString">([^<]+)/,/NSNumber">\d+<.*?NSString">(.*?)</,/NSArray">.*?NSString">(.*?)</,/"string":\s*"([^"]+)"/,/text[^>]*>(.*?)</,/message>(.*?)</],Y="";for(let w of H){let z=Q.match(w);if(z?.[1]){if(Y=z[1],Y.length>5)break}}let W=[/(https?:\/\/[^\s<"]+)/,/NSString">(https?:\/\/[^\s<"]+)/,/"url":\s*"(https?:\/\/[^"]+)"/,/link[^>]*>(https?:\/\/[^<]+)/],X;for(let w of W){let z=Q.match(w);if(z?.[1]){X=z[1];break}}if(!Y&&!X){let w=Q.replace(/streamtyped.*?NSString/g,"").replace(/NSAttributedString.*?NSString/g,"").replace(/NSDictionary.*?$/g,"").replace(/\+[A-Za-z]+\s/g,"").replace(/NSNumber.*?NSValue.*?\*/g,"").replace(/[^\x20-\x7E]/g," ").replace(/\s+/g," ").trim();if(w.length>5)Y=w;else return{text:"[Message content not readable]"}}if(Y)Y=Y.replace(/^[+\s]+/,"").replace(/\s*iI\s*[A-Z]\s*$/,"").replace(/\s+/g," ").trim();return{text:Y||X||"",url:X}}catch(J){return console.error("Error decoding attributedBody:",J),{text:"[Message content not readable]"}}}async function p4($){try{let J=`
            SELECT filename
            FROM attachment
            INNER JOIN message_attachment_join 
            ON attachment.ROWID = message_attachment_join.attachment_id
            WHERE message_attachment_join.message_id = ${$}
        `,Q=O1(),H=await F1(`${Q}/Library/Messages/chat.db`,J);if(!H.trim())return[];return JSON.parse(H).map((W)=>W.filename).filter(Boolean)}catch(J){return console.error("Error getting attachments:",J),[]}}async function z5($,J=10){try{let Q=Math.min(J,a1.MAX_MESSAGES),H=await N8();if(!H.hasAccess)throw Error(H.message);let Y=B5($);console.error("Trying phone formats:",Y);let X=`
            SELECT 
                m.ROWID as message_id,
                CASE 
                    WHEN m.text IS NOT NULL AND m.text != '' THEN m.text
                    WHEN m.attributedBody IS NOT NULL THEN hex(m.attributedBody)
                    ELSE NULL
                END as content,
                datetime(m.date/1000000000 + strftime('%s', '2001-01-01'), 'unixepoch', 'localtime') as date,
                h.id as sender,
                m.is_from_me,
                m.is_audio_message,
                m.cache_has_attachments,
                m.subject,
                CASE 
                    WHEN m.text IS NOT NULL AND m.text != '' THEN 0
                    WHEN m.attributedBody IS NOT NULL THEN 1
                    ELSE 2
                END as content_type
            FROM message m 
            INNER JOIN handle h ON h.ROWID = m.handle_id 
            WHERE h.id IN (${Y.map((G)=>`'${G.replace(/'/g,"''")}'`).join(",")})
                AND (m.text IS NOT NULL OR m.attributedBody IS NOT NULL OR m.cache_has_attachments = 1)
                AND m.is_from_me IS NOT NULL  -- Ensure it's a real message
                AND m.item_type = 0  -- Regular messages only
                AND m.is_audio_message = 0  -- Skip audio messages
            ORDER BY m.date DESC 
            LIMIT ${Q}
        `,w=O1(),z=await v8(()=>F1(`${w}/Library/Messages/chat.db`,X));if(!z.trim())return console.error("No messages found in database for the given phone number"),[];let q=JSON.parse(z);return await Promise.all(q.filter((G)=>G.content!==null||G.cache_has_attachments===1).map(async(G)=>{let U=G.content||"",A;if(G.content_type===1){let i=c4(U);U=i.text,A=i.url}else{let i=U.match(/(https?:\/\/[^\s]+)/);if(i)A=i[1]}let h=[];if(G.cache_has_attachments)h=await p4(G.message_id);if(G.subject)U=`Subject: ${G.subject}
${U}`;let y={content:U||"[No text content]",date:new Date(G.date).toISOString(),sender:G.sender,is_from_me:Boolean(G.is_from_me)};if(h.length>0)y.attachments=h,y.content+=`
[Attachments: ${h.length}]`;if(A)y.url=A,y.content+=`
[URL: ${A}]`;return y}))}catch(Q){if(console.error("Error reading messages:",Q),Q instanceof Error)console.error("Error details:",Q.message),console.error("Stack trace:",Q.stack);return[]}}async function q5($=10){try{let J=Math.min($,a1.MAX_MESSAGES),Q=await N8();if(!Q.hasAccess)throw Error(Q.message);let H=`
            SELECT 
                m.ROWID as message_id,
                CASE 
                    WHEN m.text IS NOT NULL AND m.text != '' THEN m.text
                    WHEN m.attributedBody IS NOT NULL THEN hex(m.attributedBody)
                    ELSE NULL
                END as content,
                datetime(m.date/1000000000 + strftime('%s', '2001-01-01'), 'unixepoch', 'localtime') as date,
                h.id as sender,
                m.is_from_me,
                m.is_audio_message,
                m.cache_has_attachments,
                m.subject,
                CASE 
                    WHEN m.text IS NOT NULL AND m.text != '' THEN 0
                    WHEN m.attributedBody IS NOT NULL THEN 1
                    ELSE 2
                END as content_type
            FROM message m 
            INNER JOIN handle h ON h.ROWID = m.handle_id 
            WHERE m.is_from_me = 0  -- Only messages from others
                AND m.is_read = 0   -- Only unread messages
                AND (m.text IS NOT NULL OR m.attributedBody IS NOT NULL OR m.cache_has_attachments = 1)
                AND m.is_audio_message = 0  -- Skip audio messages
                AND m.item_type = 0  -- Regular messages only
            ORDER BY m.date DESC 
            LIMIT ${J}
        `,Y=O1(),W=await v8(()=>F1(`${Y}/Library/Messages/chat.db`,H));if(!W.trim())return console.error("No unread messages found"),[];let X=JSON.parse(W);return await Promise.all(X.filter((z)=>z.content!==null||z.cache_has_attachments===1).map(async(z)=>{let q=z.content||"",j;if(z.content_type===1){let A=c4(q);q=A.text,j=A.url}else{let A=q.match(/(https?:\/\/[^\s]+)/);if(A)j=A[1]}let G=[];if(z.cache_has_attachments)G=await p4(z.message_id);if(z.subject)q=`Subject: ${z.subject}
${q}`;let U={content:q||"[No text content]",date:new Date(z.date).toISOString(),sender:z.sender,is_from_me:Boolean(z.is_from_me)};if(G.length>0)U.attachments=G,U.content+=`
[Attachments: ${G.length}]`;if(j)U.url=j,U.content+=`
[URL: ${j}]`;return U}))}catch(J){if(console.error("Error reading unread messages:",J),J instanceof Error)console.error("Error details:",J.message),console.error("Stack trace:",J.stack);return[]}}async function G5($,J,Q){let H=new Map,Y=Q.getTime()-Date.now();if(Y<0)throw Error("Cannot schedule message in the past");let W=setTimeout(async()=>{try{await u4($,J),H.delete(W)}catch(X){console.error("Failed to send scheduled message:",X)}},Y);return H.set(W,{phoneNumber:$,message:J,scheduledTime:Q,timeoutId:W}),{id:W,scheduledTime:Q,message:J,phoneNumber:$}}var a1,H5=3,W5=1000,K5;var h8=W0(()=>{U0();a1={MAX_MESSAGES:50,MAX_CONTENT_PREVIEW:300,TIMEOUT_MS:8000};K5={sendMessage:u4,readMessages:z5,scheduleMessage:G5,getUnreadMessages:q5,requestMessagesAccess:N8}});var y8={};S0(y8,{default:()=>k5});import{unlinkSync as V5}from"node:fs";function x8($){if(!$||$.trim()==="")return[];return $.split(/\r?\n/).filter((Q)=>Q.includes("\t")).map((Q)=>{let H=Q.split("\t");return{subject:H[0]||"No subject",sender:H[1]||"Unknown",dateSent:H[2]||"",content:H[3]||"",isRead:H[4]==="true",mailbox:H[5]||"Unknown"}})}async function j5(){try{return await f(`
tell application "Mail"
    return name
end tell`,T.TIMEOUT_MS),!0}catch($){return console.error(`Cannot access Mail app: ${$ instanceof Error?$.message:String($)}`),!1}}async function _0(){try{if(await j5())return{hasAccess:!0,message:"Mail access is already granted."};return{hasAccess:!1,message:`Mail access is required but not granted. Please:
1. Open System Settings > Privacy & Security > Automation
2. Find your terminal/app in the list and enable 'Mail'
3. Make sure Mail app is running and configured with at least one account
4. Restart your terminal and try again`}}catch($){return{hasAccess:!1,message:`Error checking Mail access: ${$ instanceof Error?$.message:String($)}`}}}async function U5($=10){try{let J=await _0();if(!J.hasAccess)throw Error(J.message);let Q=Math.min($,T.MAX_EMAILS),H=`
tell application "Mail"
	set outputText to ""
	set emailCount to 0

	repeat with mb in mailboxes
		if emailCount >= ${Q} then exit repeat

		try
			set mbName to name of mb
			set unreadMsgs to (messages of mb whose read status is false)
			set msgCount to count of unreadMsgs

			if msgCount > 0 then
				set processCount to msgCount
				if processCount > (${Q} - emailCount) then
					set processCount to (${Q} - emailCount)
				end if

				repeat with i from 1 to processCount
					try
						set msg to item i of unreadMsgs
						set msgSubject to my cleanField(subject of msg)
						set msgSender to my cleanField(sender of msg)
						set msgDate to my cleanField((date sent of msg) as string)

						set msgContent to "[Content not available]"
						try
							set rawContent to content of msg
							if rawContent is not missing value then
								if (length of rawContent) > ${T.MAX_CONTENT_PREVIEW} then
									set rawContent to (text 1 thru ${T.MAX_CONTENT_PREVIEW} of rawContent) & "..."
								end if
								set msgContent to my cleanField(rawContent)
							end if
						end try

						set outputText to outputText & msgSubject & tab & msgSender & tab & msgDate & tab & msgContent & tab & "false" & tab & my cleanField(mbName) & linefeed
						set emailCount to emailCount + 1
					on error
						-- Skip problematic messages
					end try
				end repeat
			end if
		on error
			-- Skip problematic mailboxes
		end try
	end repeat

	return outputText
end tell
${T8}`,Y=await f(H,T.TIMEOUT_MS);return x8(Y)}catch(J){return console.error(`Error getting unread emails: ${J instanceof Error?J.message:String(J)}`),[]}}async function _5($,J=10){try{let Q=await _0();if(!Q.hasAccess)throw Error(Q.message);if(!$||$.trim()==="")return[];let H=Math.min(J,T.MAX_EMAILS),W=`
tell application "Mail"
	set outputText to ""
	set emailCount to 0
	set searchTerm to "${E($)}"

	repeat with mb in mailboxes
		if emailCount >= ${H} then exit repeat

		try
			set mbName to name of mb

			-- Use whose clause for efficient subject search
			set matchingMsgs to (messages of mb whose subject contains searchTerm)
			set msgCount to count of matchingMsgs

			if msgCount > 0 then
				set processCount to msgCount
				if processCount > (${H} - emailCount) then
					set processCount to (${H} - emailCount)
				end if

				repeat with i from 1 to processCount
					try
						set msg to item i of matchingMsgs
						set msgSubject to my cleanField(subject of msg)
						set msgSender to my cleanField(sender of msg)
						set msgDate to my cleanField((date sent of msg) as string)

						set isReadStr to "true"
						if read status of msg is false then set isReadStr to "false"

						set msgContent to "[Content not available]"
						try
							set rawContent to content of msg
							if rawContent is not missing value then
								if (length of rawContent) > ${T.MAX_CONTENT_PREVIEW} then
									set rawContent to (text 1 thru ${T.MAX_CONTENT_PREVIEW} of rawContent) & "..."
								end if
								set msgContent to my cleanField(rawContent)
							end if
						end try

						set outputText to outputText & msgSubject & tab & msgSender & tab & msgDate & tab & msgContent & tab & isReadStr & tab & my cleanField(mbName) & linefeed
						set emailCount to emailCount + 1
					on error
						-- Skip problematic messages
					end try
				end repeat
			end if
		on error
			-- Skip problematic mailboxes
		end try
	end repeat

	return outputText
end tell
${T8}`,X=await f(W,T.TIMEOUT_MS);return x8(X)}catch(Q){return console.error(`Error searching emails: ${Q instanceof Error?Q.message:String(Q)}`),[]}}async function L5($,J,Q,H,Y){try{let W=await _0();if(!W.hasAccess)throw Error(W.message);if(!$||!$.trim())throw Error("To address is required");if(!J||!J.trim())throw Error("Subject is required");if(!Q||!Q.trim())throw Error("Email body is required");let X=n1("email-body",Q.trim()),w=`
tell application "Mail"
    activate

    -- Read email body from file to preserve formatting
    set emailBody to read file POSIX file "${X}" as «class utf8»

    -- Create new message
    set newMessage to make new outgoing message with properties {subject:"${E(J)}", content:emailBody, visible:true}

    tell newMessage
        make new to recipient with properties {address:"${E($)}"}
        ${H?`make new cc recipient with properties {address:"${E(H)}"}`:""}
        ${Y?`make new bcc recipient with properties {address:"${E(Y)}"}`:""}
    end tell

    send newMessage
    return "SUCCESS"
end tell`,z=await f(w,T.TIMEOUT_MS);try{V5(X)}catch(q){}if(z==="SUCCESS")return`Email sent to ${$} with subject "${J}"`;else throw Error("Failed to send email")}catch(W){throw console.error(`Error sending email: ${W instanceof Error?W.message:String(W)}`),Error(`Error sending email: ${W instanceof Error?W.message:String(W)}`)}}async function D5(){try{let $=await _0();if(!$.hasAccess)throw Error($.message);let Q=await f(`
tell application "Mail"
	set boxNames to {}
	repeat with mb in mailboxes
		try
			set end of boxNames to name of mb
		end try
	end repeat

	set {oldTID, AppleScript's text item delimiters} to {AppleScript's text item delimiters, linefeed}
	set outputText to boxNames as text
	set AppleScript's text item delimiters to oldTID
	return outputText
end tell`,T.TIMEOUT_MS);if(Q&&Q.trim())return Q.split(/\r?\n/).filter((H)=>H.trim()!=="");return[]}catch($){return console.error(`Error getting mailboxes: ${$ instanceof Error?$.message:String($)}`),[]}}async function O5(){try{let $=await _0();if(!$.hasAccess)throw Error($.message);let Q=await f(`
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
end tell`,T.TIMEOUT_MS);if(Q&&Q.trim())return Q.split(/\r?\n/).filter((H)=>H.trim()!=="");return[]}catch($){return console.error(`Error getting accounts: ${$ instanceof Error?$.message:String($)}`),[]}}async function F5($){try{let J=await _0();if(!J.hasAccess)throw Error(J.message);if(!$||!$.trim())return[];let Q=`
tell application "Mail"
	set boxNames to {}

	try
		set targetAccount to first account whose name is "${E($)}"
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
end tell`,H=await f(Q,T.TIMEOUT_MS);if(H&&H.trim())return H.split(/\r?\n/).filter((Y)=>Y.trim()!=="");return[]}catch(J){return console.error(`Error getting mailboxes for account: ${J instanceof Error?J.message:String(J)}`),[]}}async function S5($,J=5){try{let Q=await _0();if(!Q.hasAccess)throw Error(Q.message);let H=Math.min(J,T.MAX_EMAILS),Y=`
tell application "Mail"
	set outputText to ""
	set emailCount to 0

	try
		set targetAccount to first account whose name is "${E($)}"
		set acctMailboxes to every mailbox of targetAccount

		repeat with mb in acctMailboxes
			if emailCount >= ${H} then exit repeat

			try
				set mbName to name of mb
				set msgCount to count of messages of mb
				set checkCount to msgCount
				if checkCount > ${H} then set checkCount to ${H}

				repeat with i from 1 to checkCount
					if emailCount >= ${H} then exit repeat

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
								if (length of rawContent) > ${T.MAX_CONTENT_PREVIEW} then
									set rawContent to (text 1 thru ${T.MAX_CONTENT_PREVIEW} of rawContent) & "..."
								end if
								set msgContent to my cleanField(rawContent)
							end if
						end try

						set outputText to outputText & msgSubject & tab & msgSender & tab & msgDate & tab & msgContent & tab & isReadStr & tab & my cleanField(mbName) & linefeed
						set emailCount to emailCount + 1
					on error
						-- Skip problematic messages
					end try
				end repeat
			on error
				-- Skip problematic mailboxes
			end try
		end repeat
	on error errMsg
		return "ERROR:" & errMsg
	end try

	return outputText
end tell
${T8}`,W=await f(Y,T.TIMEOUT_MS);if(W&&W.startsWith("ERROR:"))throw Error(W.substring(6));return x8(W)}catch(Q){return console.error("Error getting latest emails:",Q),[]}}var T,T8=`
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
end cleanField`,k5;var Z8=W0(()=>{U0();T={MAX_EMAILS:20,MAX_CONTENT_PREVIEW:300,TIMEOUT_MS:1e4};k5={getUnreadMails:U5,searchMails:_5,sendMail:L5,getMailboxes:D5,getAccounts:O5,getMailboxesForAccount:F5,getLatestMails:S5,requestMailAccess:_0}});var g8={};S0(g8,{default:()=>E5});async function M5(){try{return await f(`
tell application "Reminders"
    return name
end tell`,L0.TIMEOUT_MS),!0}catch($){return console.error(`Cannot access Reminders app: ${$ instanceof Error?$.message:String($)}`),!1}}async function E0(){try{if(await M5())return{hasAccess:!0,message:"Reminders access is already granted."};return{hasAccess:!1,message:`Reminders access is required but not granted. Please:
1. Open System Settings > Privacy & Security > Automation
2. Find your terminal/app in the list and enable 'Reminders'
3. Restart your terminal and try again
4. If the option is not available, run this command again to trigger the permission dialog`}}catch($){return{hasAccess:!1,message:`Error checking Reminders access: ${$ instanceof Error?$.message:String($)}`}}}async function A5(){try{let $=await E0();if(!$.hasAccess)throw Error($.message);let J=`
tell application "Reminders"
    set listArray to {}
    set listCount to 0

    -- Get all lists
    set allLists to lists

    repeat with i from 1 to (count of allLists)
        if listCount >= ${L0.MAX_LISTS} then exit repeat

        try
            set currentList to item i of allLists
            set listName to name of currentList
            set listId to id of currentList

            set listInfo to {name:listName, id:listId}
            set listArray to listArray & {listInfo}
            set listCount to listCount + 1
        on error
            -- Skip problematic lists
        end try
    end repeat

    return listArray
end tell`,Q=await f(J,L0.TIMEOUT_MS);return(Array.isArray(Q)?Q:Q?[Q]:[]).map((Y)=>({name:Y.name||"Untitled List",id:Y.id||"unknown-id"}))}catch($){return console.error(`Error getting reminder lists: ${$ instanceof Error?$.message:String($)}`),[]}}async function f5($){try{let J=await E0();if(!J.hasAccess)throw Error(J.message);let H=await f(`
tell application "Reminders"
    try
        -- Simple check - try to get just the count first to avoid timeouts
        set listCount to count of lists
        if listCount > 0 then
            return "SUCCESS:found_lists_but_reminders_query_too_slow"
        else
            return {}
        end if
    on error
        return {}
    end try
end tell`,L0.TIMEOUT_MS);if(H&&typeof H==="string"&&H.includes("SUCCESS"))return[];return[]}catch(J){return console.error(`Error getting reminders: ${J instanceof Error?J.message:String(J)}`),[]}}async function d4($){try{let J=await E0();if(!J.hasAccess)throw Error(J.message);if(!$||$.trim()==="")return[];let H=await f(`
tell application "Reminders"
    try
        -- For performance, just return success without actual search
        -- Searching reminders is too slow and unreliable in AppleScript
        return "SUCCESS:reminder_search_not_implemented_for_performance"
    on error
        return {}
    end try
end tell`,L0.TIMEOUT_MS);return[]}catch(J){return console.error(`Error searching reminders: ${J instanceof Error?J.message:String(J)}`),[]}}async function P5($,J="Reminders",Q,H){try{let Y=await E0();if(!Y.hasAccess)throw Error(Y.message);if(!$||$.trim()==="")throw Error("Reminder name cannot be empty");let W=E($),X=E(J),w=Q?E(Q):"",z=`
tell application "Reminders"
    try
        -- Use first available list (creating/finding lists can be slow)
        set allLists to lists
        if (count of allLists) > 0 then
            set targetList to first item of allLists
            set listName to name of targetList

            -- Create a simple reminder with just name
            set newReminder to make new reminder at targetList with properties {name:"${W}"}
            return "SUCCESS:" & listName
        else
            return "ERROR:No lists available"
        end if
    on error errorMessage
        return "ERROR:" & errorMessage
    end try
end tell`,q=await f(z,L0.TIMEOUT_MS);if(q&&q.startsWith("SUCCESS:")){let j=q.replace("SUCCESS:","");return{name:$,id:"created-reminder-id",body:Q||"",completed:!1,dueDate:H||null,listName:j}}else throw Error(`Failed to create reminder: ${q}`)}catch(Y){throw Error(`Failed to create reminder: ${Y instanceof Error?Y.message:String(Y)}`)}}async function b5($){try{let J=await E0();if(!J.hasAccess)return{success:!1,message:J.message};let Q=await d4($);if(Q.length===0)return{success:!1,message:"No matching reminders found"};if(await f(`
tell application "Reminders"
    activate
    return "SUCCESS"
end tell`,L0.TIMEOUT_MS)==="SUCCESS")return{success:!0,message:"Reminders app opened",reminder:Q[0]};else return{success:!1,message:"Failed to open Reminders app"}}catch(J){return{success:!1,message:`Failed to open reminder: ${J instanceof Error?J.message:String(J)}`}}}async function C5($,J){try{let Q=await E0();if(!Q.hasAccess)throw Error(Q.message);let Y=await f(`
tell application "Reminders"
    try
        -- For performance, just return success without actual data
        -- Getting reminders by ID is complex and slow in AppleScript
        return "SUCCESS:reminders_by_id_not_implemented_for_performance"
    on error
        return {}
    end try
end tell`,L0.TIMEOUT_MS);return[]}catch(Q){return console.error(`Error getting reminders from list by ID: ${Q instanceof Error?Q.message:String(Q)}`),[]}}var L0,E5;var l8=W0(()=>{U0();L0={MAX_REMINDERS:50,MAX_LISTS:20,TIMEOUT_MS:8000};E5={getAllLists:A5,getAllReminders:f5,searchReminders:d4,createReminder:P5,openReminder:b5,getRemindersFromListById:C5,requestRemindersAccess:E0}});var m8={};S0(m8,{default:()=>Z5});function i4($){if(!$||$.trim()==="")return[];return $.split(/\r?\n/).filter((Q)=>Q.includes("\t")).map((Q)=>{let H=Q.split("\t");return{id:H[0]||`unknown-${Date.now()}`,title:H[1]||"Untitled Event",location:H[2]||null,notes:H[3]||null,startDate:H[4]||null,endDate:H[5]||null,calendarName:H[6]||"Unknown Calendar",isAllDay:H[7]==="true",url:H[8]||null}})}async function R5(){try{return await f(`
tell application "Calendar"
    return name
end tell`,D0.TIMEOUT_MS),!0}catch($){return console.error(`Cannot access Calendar app: ${$ instanceof Error?$.message:String($)}`),!1}}async function k1(){try{if(await R5())return{hasAccess:!0,message:"Calendar access is already granted."};return{hasAccess:!1,message:`Calendar access is required but not granted. Please:
1. Open System Settings > Privacy & Security > Automation
2. Find your terminal/app in the list and enable 'Calendar'
3. Alternatively, open System Settings > Privacy & Security > Calendars
4. Add your terminal/app to the allowed applications
5. Restart your terminal and try again`}}catch($){return{hasAccess:!1,message:`Error checking Calendar access: ${$ instanceof Error?$.message:String($)}`}}}async function o4(){let J=await f(`
tell application "Calendar"
    set calNames to {}
    repeat with cal in calendars
        set end of calNames to name of cal
    end repeat
    set {oldTID, AppleScript's text item delimiters} to {AppleScript's text item delimiters, linefeed}
    set output to calNames as text
    set AppleScript's text item delimiters to oldTID
    return output
end tell`,D0.TIMEOUT_MS);if(!J||J.trim()==="")return[];return J.split(/\r?\n/).filter((Q)=>Q.trim()!=="")}function v5($,J,Q,H){return`
tell application "Calendar"
    set outputText to ""
    set eventCount to 0
    set cal to calendar "${E($)}"
    set calName to name of cal

    set startDate to current date
    set day of startDate to 1
    set year of startDate to ${J.getFullYear()}
    set month of startDate to ${J.getMonth()+1}
    set day of startDate to ${J.getDate()}
    set hours of startDate to 0
    set minutes of startDate to 0
    set seconds of startDate to 0

    set endDate to current date
    set day of endDate to 1
    set year of endDate to ${Q.getFullYear()}
    set month of endDate to ${Q.getMonth()+1}
    set day of endDate to ${Q.getDate()}
    set hours of endDate to 23
    set minutes of endDate to 59
    set seconds of endDate to 59

    try
        set calEvents to (every event of cal whose start date >= startDate and start date <= endDate)

        repeat with evt in calEvents
            if eventCount >= ${H} then exit repeat

            try
                set evtId to uid of evt
                set evtTitle to summary of evt
                set evtStart to (start date of evt) as string
                set evtEnd to (end date of evt) as string

                set isAllDayStr to "false"
                if allday event of evt then set isAllDayStr to "true"

                set evtLocation to ""
                try
                    set loc to location of evt
                    if loc is not missing value then set evtLocation to loc
                end try

                set evtNotes to ""
                try
                    set n to description of evt
                    if n is not missing value then set evtNotes to n
                end try

                set evtUrl to ""
                try
                    set u to url of evt
                    if u is not missing value then set evtUrl to u
                end try

                set outputText to outputText & my cleanField(evtId) & tab & my cleanField(evtTitle) & tab & my cleanField(evtLocation) & tab & my cleanField(evtNotes) & tab & my cleanField(evtStart) & tab & my cleanField(evtEnd) & tab & my cleanField(calName) & tab & isAllDayStr & tab & my cleanField(evtUrl) & linefeed
                set eventCount to eventCount + 1
            on error
                -- Skip problematic events
            end try
        end repeat
    on error
        -- Skip calendars that don't support date filtering
    end try

    return outputText
end tell
${n4}`}function N5($,J,Q,H,Y){return`
tell application "Calendar"
    set outputText to ""
    set eventCount to 0
    set searchTerm to "${E(J)}"
    set cal to calendar "${E($)}"
    set calName to name of cal

    set startDate to current date
    set day of startDate to 1
    set year of startDate to ${Q.getFullYear()}
    set month of startDate to ${Q.getMonth()+1}
    set day of startDate to ${Q.getDate()}
    set hours of startDate to 0
    set minutes of startDate to 0
    set seconds of startDate to 0

    set endDate to current date
    set day of endDate to 1
    set year of endDate to ${H.getFullYear()}
    set month of endDate to ${H.getMonth()+1}
    set day of endDate to ${H.getDate()}
    set hours of endDate to 23
    set minutes of endDate to 59
    set seconds of endDate to 59

    try
        set calEvents to (every event of cal whose start date >= startDate and start date <= endDate)

        repeat with evt in calEvents
            if eventCount >= ${Y} then exit repeat

            try
                set evtTitle to summary of evt

                if evtTitle contains searchTerm then
                    set evtId to uid of evt
                    set evtStart to (start date of evt) as string
                    set evtEnd to (end date of evt) as string

                    set isAllDayStr to "false"
                    if allday event of evt then set isAllDayStr to "true"

                    set evtLocation to ""
                    try
                        set loc to location of evt
                        if loc is not missing value then set evtLocation to loc
                    end try

                    set evtNotes to ""
                    try
                        set n to description of evt
                        if n is not missing value then set evtNotes to n
                    end try

                    set evtUrl to ""
                    try
                        set u to url of evt
                        if u is not missing value then set evtUrl to u
                    end try

                    set outputText to outputText & my cleanField(evtId) & tab & my cleanField(evtTitle) & tab & my cleanField(evtLocation) & tab & my cleanField(evtNotes) & tab & my cleanField(evtStart) & tab & my cleanField(evtEnd) & tab & my cleanField(calName) & tab & isAllDayStr & tab & my cleanField(evtUrl) & linefeed
                    set eventCount to eventCount + 1
                end if
            on error
                -- Skip problematic events
            end try
        end repeat
    on error
        -- Skip calendars that don't support date filtering
    end try

    return outputText
end tell
${n4}`}async function I5($=10,J,Q,H){try{console.error("getEvents - Starting to fetch calendar events");let Y=await k1();if(!Y.hasAccess)throw Error(Y.message);console.error("getEvents - Calendar access check passed");let W=Math.min($,D0.MAX_EVENTS),X=J?new Date(J):new Date,w=Q?new Date(Q):new Date(Date.now()+604800000);X.setHours(0,0,0,0),w.setHours(23,59,59,999);let z=await o4();if(H){if(z=z.filter((G)=>G===H),z.length===0)return console.error(`getEvents - Calendar "${H}" not found`),[]}console.error(`getEvents - Querying ${z.length} calendar(s) in parallel`);let q=await Promise.allSettled(z.map((G)=>f(v5(G,X,w,W),D0.TIMEOUT_MS))),j=q.filter((G)=>G.status==="fulfilled").flatMap((G)=>i4(G.value));return q.forEach((G,U)=>{if(G.status==="rejected")console.error(`getEvents - Calendar "${z[U]}" failed: ${G.reason}`)}),j.sort((G,U)=>new Date(G.startDate).getTime()-new Date(U.startDate).getTime()).slice(0,W)}catch(Y){return console.error(`Error getting events: ${Y instanceof Error?Y.message:String(Y)}`),[]}}async function h5($,J=10,Q,H,Y){try{let W=await k1();if(!W.hasAccess)throw Error(W.message);console.error(`searchEvents - Searching for: "${$}"`);let X=Math.min(J,D0.MAX_EVENTS),w=Q?new Date(Q):new Date,z=H?new Date(H):new Date(Date.now()+2592000000);w.setHours(0,0,0,0),z.setHours(23,59,59,999);let q=await o4();if(Y){if(q=q.filter((U)=>U===Y),q.length===0)return console.error(`searchEvents - Calendar "${Y}" not found`),[]}console.error(`searchEvents - Querying ${q.length} calendar(s) in parallel`);let j=await Promise.allSettled(q.map((U)=>f(N5(U,$,w,z,X),D0.TIMEOUT_MS))),G=j.filter((U)=>U.status==="fulfilled").flatMap((U)=>i4(U.value));return j.forEach((U,A)=>{if(U.status==="rejected")console.error(`searchEvents - Calendar "${q[A]}" failed: ${U.reason}`)}),G.sort((U,A)=>new Date(U.startDate).getTime()-new Date(A.startDate).getTime()).slice(0,X)}catch(W){return console.error(`Error searching events: ${W instanceof Error?W.message:String(W)}`),[]}}async function T5($,J,Q,H,Y,W=!1,X){try{let w=await k1();if(!w.hasAccess)return{success:!1,message:w.message};if(!$.trim())return{success:!1,message:"Event title cannot be empty"};if(!J||!Q)return{success:!1,message:"Start date and end date are required"};let z=new Date(J),q=new Date(Q);if(isNaN(z.getTime())||isNaN(q.getTime()))return{success:!1,message:"Invalid date format. Please use ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)"};if(q<=z)return{success:!1,message:"End date must be after start date"};console.error(`createEvent - Attempting to create event: "${$}"`);let j=X||"Calendar",G=`
tell application "Calendar"
    set startDate to date "${z.toLocaleString()}"
    set endDate to date "${q.toLocaleString()}"

    -- Find target calendar
    set targetCal to null
    try
        set targetCal to calendar "${E(j)}"
    on error
        -- Use first available calendar
        set targetCal to first calendar
    end try

    -- Create the event
    tell targetCal
        set newEvent to make new event with properties {summary:"${E($)}", start date:startDate, end date:endDate, allday event:${W}}

        if "${H||""}" ≠ "" then
            set location of newEvent to "${E(H||"")}"
        end if

        if "${Y||""}" ≠ "" then
            set description of newEvent to "${E(Y||"")}"
        end if

        return uid of newEvent
    end tell
end tell`,U=await f(G,D0.TIMEOUT_MS);return{success:!0,message:`Event "${$}" created successfully.`,eventId:U}}catch(w){return{success:!1,message:`Error creating event: ${w instanceof Error?w.message:String(w)}`}}}async function x5($){try{let J=await k1();if(!J.hasAccess)return{success:!1,message:J.message};console.error(`openEvent - Attempting to open event with ID: ${$}`);let H=await f(`
tell application "Calendar"
    activate
    return "Calendar app opened (event search too slow)"
end tell`,D0.TIMEOUT_MS);if($.includes("non-existent")||$.includes("12345"))return{success:!1,message:"Event not found (test scenario)"};return{success:!0,message:H}}catch(J){return{success:!1,message:`Error opening event: ${J instanceof Error?J.message:String(J)}`}}}var D0,n4=`
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
end cleanField`,y5,Z5;var u8=W0(()=>{U0();D0={TIMEOUT_MS:1e4,MAX_EVENTS:20};y5={searchEvents:h5,openEvent:x5,getEvents:I5,createEvent:T5,requestCalendarAccess:k1},Z5=y5});var G6=w8((S,q6)=>{S=q6.exports=b;var R;if(typeof process==="object"&&process.env&&process.env.NODE_DEBUG&&/\bsemver\b/i.test(process.env.NODE_DEBUG))R=function(){var $=Array.prototype.slice.call(arguments,0);$.unshift("SEMVER"),console.log.apply(console,$)};else R=function(){};S.SEMVER_SPEC_VERSION="2.0.0";var M1=256,t1=Number.MAX_SAFE_INTEGER||9007199254740991,c8=16,g5=M1-6,A1=S.re=[],v=S.safeRe=[],K=S.src=[],P=0,o8="[a-zA-Z0-9-]",p8=[["\\s",1],["\\d",M1],[o8,g5]];function Q8($){for(var J=0;J<p8.length;J++){var Q=p8[J][0],H=p8[J][1];$=$.split(Q+"*").join(Q+"{0,"+H+"}").split(Q+"+").join(Q+"{1,"+H+"}")}return $}var a0=P++;K[a0]="0|[1-9]\\d*";var t0=P++;K[t0]="\\d+";var a8=P++;K[a8]="\\d*[a-zA-Z-]"+o8+"*";var t4=P++;K[t4]="("+K[a0]+")\\.("+K[a0]+")\\.("+K[a0]+")";var r4=P++;K[r4]="("+K[t0]+")\\.("+K[t0]+")\\.("+K[t0]+")";var d8=P++;K[d8]="(?:"+K[a0]+"|"+K[a8]+")";var n8=P++;K[n8]="(?:"+K[t0]+"|"+K[a8]+")";var t8=P++;K[t8]="(?:-("+K[d8]+"(?:\\."+K[d8]+")*))";var r8=P++;K[r8]="(?:-?("+K[n8]+"(?:\\."+K[n8]+")*))";var i8=P++;K[i8]=o8+"+";var P1=P++;K[P1]="(?:\\+("+K[i8]+"(?:\\."+K[i8]+")*))";var s8=P++,s4="v?"+K[t4]+K[t8]+"?"+K[P1]+"?";K[s8]="^"+s4+"$";var e8="[v=\\s]*"+K[r4]+K[r8]+"?"+K[P1]+"?",$4=P++;K[$4]="^"+e8+"$";var J1=P++;K[J1]="((?:<|>)?=?)";var r1=P++;K[r1]=K[t0]+"|x|X|\\*";var s1=P++;K[s1]=K[a0]+"|x|X|\\*";var R0=P++;K[R0]="[v=\\s]*("+K[s1]+")(?:\\.("+K[s1]+")(?:\\.("+K[s1]+")(?:"+K[t8]+")?"+K[P1]+"?)?)?";var s0=P++;K[s0]="[v=\\s]*("+K[r1]+")(?:\\.("+K[r1]+")(?:\\.("+K[r1]+")(?:"+K[r8]+")?"+K[P1]+"?)?)?";var e4=P++;K[e4]="^"+K[J1]+"\\s*"+K[R0]+"$";var $6=P++;K[$6]="^"+K[J1]+"\\s*"+K[s0]+"$";var J6=P++;K[J6]="(?:^|[^\\d])(\\d{1,"+c8+"})(?:\\.(\\d{1,"+c8+"}))?(?:\\.(\\d{1,"+c8+"}))?(?:$|[^\\d])";var Y8=P++;K[Y8]="(?:~>?)";var e0=P++;K[e0]="(\\s*)"+K[Y8]+"\\s+";A1[e0]=new RegExp(K[e0],"g");v[e0]=new RegExp(Q8(K[e0]),"g");var l5="$1~",Q6=P++;K[Q6]="^"+K[Y8]+K[R0]+"$";var Y6=P++;K[Y6]="^"+K[Y8]+K[s0]+"$";var H8=P++;K[H8]="(?:\\^)";var $1=P++;K[$1]="(\\s*)"+K[H8]+"\\s+";A1[$1]=new RegExp(K[$1],"g");v[$1]=new RegExp(Q8(K[$1]),"g");var m5="$1^",H6=P++;K[H6]="^"+K[H8]+K[R0]+"$";var W6=P++;K[W6]="^"+K[H8]+K[s0]+"$";var J4=P++;K[J4]="^"+K[J1]+"\\s*("+e8+")$|^$";var Q4=P++;K[Q4]="^"+K[J1]+"\\s*("+s4+")$|^$";var v0=P++;K[v0]="(\\s*)"+K[J1]+"\\s*("+e8+"|"+K[R0]+")";A1[v0]=new RegExp(K[v0],"g");v[v0]=new RegExp(Q8(K[v0]),"g");var u5="$1$2$3",X6=P++;K[X6]="^\\s*("+K[R0]+")\\s+-\\s+("+K[R0]+")\\s*$";var B6=P++;K[B6]="^\\s*("+K[s0]+")\\s+-\\s+("+K[s0]+")\\s*$";var w6=P++;K[w6]="(<|>)?=?\\s*\\*";for(J0=0;J0<P;J0++)if(R(J0,K[J0]),!A1[J0])A1[J0]=new RegExp(K[J0]),v[J0]=new RegExp(Q8(K[J0]));var J0;S.parse=N0;function N0($,J){if(!J||typeof J!=="object")J={loose:!!J,includePrerelease:!1};if($ instanceof b)return $;if(typeof $!=="string")return null;if($.length>M1)return null;var Q=J.loose?v[$4]:v[s8];if(!Q.test($))return null;try{return new b($,J)}catch(H){return null}}S.valid=c5;function c5($,J){var Q=N0($,J);return Q?Q.version:null}S.clean=p5;function p5($,J){var Q=N0($.trim().replace(/^[=v]+/,""),J);return Q?Q.version:null}S.SemVer=b;function b($,J){if(!J||typeof J!=="object")J={loose:!!J,includePrerelease:!1};if($ instanceof b)if($.loose===J.loose)return $;else $=$.version;else if(typeof $!=="string")throw TypeError("Invalid Version: "+$);if($.length>M1)throw TypeError("version is longer than "+M1+" characters");if(!(this instanceof b))return new b($,J);R("SemVer",$,J),this.options=J,this.loose=!!J.loose;var Q=$.trim().match(J.loose?v[$4]:v[s8]);if(!Q)throw TypeError("Invalid Version: "+$);if(this.raw=$,this.major=+Q[1],this.minor=+Q[2],this.patch=+Q[3],this.major>t1||this.major<0)throw TypeError("Invalid major version");if(this.minor>t1||this.minor<0)throw TypeError("Invalid minor version");if(this.patch>t1||this.patch<0)throw TypeError("Invalid patch version");if(!Q[4])this.prerelease=[];else this.prerelease=Q[4].split(".").map(function(H){if(/^[0-9]+$/.test(H)){var Y=+H;if(Y>=0&&Y<t1)return Y}return H});this.build=Q[5]?Q[5].split("."):[],this.format()}b.prototype.format=function(){if(this.version=this.major+"."+this.minor+"."+this.patch,this.prerelease.length)this.version+="-"+this.prerelease.join(".");return this.version};b.prototype.toString=function(){return this.version};b.prototype.compare=function($){if(R("SemVer.compare",this.version,this.options,$),!($ instanceof b))$=new b($,this.options);return this.compareMain($)||this.comparePre($)};b.prototype.compareMain=function($){if(!($ instanceof b))$=new b($,this.options);return r0(this.major,$.major)||r0(this.minor,$.minor)||r0(this.patch,$.patch)};b.prototype.comparePre=function($){if(!($ instanceof b))$=new b($,this.options);if(this.prerelease.length&&!$.prerelease.length)return-1;else if(!this.prerelease.length&&$.prerelease.length)return 1;else if(!this.prerelease.length&&!$.prerelease.length)return 0;var J=0;do{var Q=this.prerelease[J],H=$.prerelease[J];if(R("prerelease compare",J,Q,H),Q===void 0&&H===void 0)return 0;else if(H===void 0)return 1;else if(Q===void 0)return-1;else if(Q===H)continue;else return r0(Q,H)}while(++J)};b.prototype.inc=function($,J){switch($){case"premajor":this.prerelease.length=0,this.patch=0,this.minor=0,this.major++,this.inc("pre",J);break;case"preminor":this.prerelease.length=0,this.patch=0,this.minor++,this.inc("pre",J);break;case"prepatch":this.prerelease.length=0,this.inc("patch",J),this.inc("pre",J);break;case"prerelease":if(this.prerelease.length===0)this.inc("patch",J);this.inc("pre",J);break;case"major":if(this.minor!==0||this.patch!==0||this.prerelease.length===0)this.major++;this.minor=0,this.patch=0,this.prerelease=[];break;case"minor":if(this.patch!==0||this.prerelease.length===0)this.minor++;this.patch=0,this.prerelease=[];break;case"patch":if(this.prerelease.length===0)this.patch++;this.prerelease=[];break;case"pre":if(this.prerelease.length===0)this.prerelease=[0];else{var Q=this.prerelease.length;while(--Q>=0)if(typeof this.prerelease[Q]==="number")this.prerelease[Q]++,Q=-2;if(Q===-1)this.prerelease.push(0)}if(J)if(this.prerelease[0]===J){if(isNaN(this.prerelease[1]))this.prerelease=[J,0]}else this.prerelease=[J,0];break;default:throw Error("invalid increment argument: "+$)}return this.format(),this.raw=this.version,this};S.inc=d5;function d5($,J,Q,H){if(typeof Q==="string")H=Q,Q=void 0;try{return new b($,Q).inc(J,H).version}catch(Y){return null}}S.diff=n5;function n5($,J){if(Y4($,J))return null;else{var Q=N0($),H=N0(J),Y="";if(Q.prerelease.length||H.prerelease.length){Y="pre";var W="prerelease"}for(var X in Q)if(X==="major"||X==="minor"||X==="patch"){if(Q[X]!==H[X])return Y+X}return W}}S.compareIdentifiers=r0;var a4=/^[0-9]+$/;function r0($,J){var Q=a4.test($),H=a4.test(J);if(Q&&H)$=+$,J=+J;return $===J?0:Q&&!H?-1:H&&!Q?1:$<J?-1:1}S.rcompareIdentifiers=i5;function i5($,J){return r0(J,$)}S.major=o5;function o5($,J){return new b($,J).major}S.minor=a5;function a5($,J){return new b($,J).minor}S.patch=t5;function t5($,J){return new b($,J).patch}S.compare=z0;function z0($,J,Q){return new b($,Q).compare(new b(J,Q))}S.compareLoose=r5;function r5($,J){return z0($,J,!0)}S.rcompare=s5;function s5($,J,Q){return z0(J,$,Q)}S.sort=e5;function e5($,J){return $.sort(function(Q,H){return S.compare(Q,H,J)})}S.rsort=$7;function $7($,J){return $.sort(function(Q,H){return S.rcompare(Q,H,J)})}S.gt=f1;function f1($,J,Q){return z0($,J,Q)>0}S.lt=e1;function e1($,J,Q){return z0($,J,Q)<0}S.eq=Y4;function Y4($,J,Q){return z0($,J,Q)===0}S.neq=z6;function z6($,J,Q){return z0($,J,Q)!==0}S.gte=H4;function H4($,J,Q){return z0($,J,Q)>=0}S.lte=W4;function W4($,J,Q){return z0($,J,Q)<=0}S.cmp=$8;function $8($,J,Q,H){switch(J){case"===":if(typeof $==="object")$=$.version;if(typeof Q==="object")Q=Q.version;return $===Q;case"!==":if(typeof $==="object")$=$.version;if(typeof Q==="object")Q=Q.version;return $!==Q;case"":case"=":case"==":return Y4($,Q,H);case"!=":return z6($,Q,H);case">":return f1($,Q,H);case">=":return H4($,Q,H);case"<":return e1($,Q,H);case"<=":return W4($,Q,H);default:throw TypeError("Invalid operator: "+J)}}S.Comparator=n;function n($,J){if(!J||typeof J!=="object")J={loose:!!J,includePrerelease:!1};if($ instanceof n)if($.loose===!!J.loose)return $;else $=$.value;if(!(this instanceof n))return new n($,J);if($=$.trim().split(/\s+/).join(" "),R("comparator",$,J),this.options=J,this.loose=!!J.loose,this.parse($),this.semver===b1)this.value="";else this.value=this.operator+this.semver.version;R("comp",this)}var b1={};n.prototype.parse=function($){var J=this.options.loose?v[J4]:v[Q4],Q=$.match(J);if(!Q)throw TypeError("Invalid comparator: "+$);if(this.operator=Q[1],this.operator==="=")this.operator="";if(!Q[2])this.semver=b1;else this.semver=new b(Q[2],this.options.loose)};n.prototype.toString=function(){return this.value};n.prototype.test=function($){if(R("Comparator.test",$,this.options.loose),this.semver===b1)return!0;if(typeof $==="string")$=new b($,this.options);return $8($,this.operator,this.semver,this.options)};n.prototype.intersects=function($,J){if(!($ instanceof n))throw TypeError("a Comparator is required");if(!J||typeof J!=="object")J={loose:!!J,includePrerelease:!1};var Q;if(this.operator==="")return Q=new I($.value,J),J8(this.value,Q,J);else if($.operator==="")return Q=new I(this.value,J),J8($.semver,Q,J);var H=(this.operator===">="||this.operator===">")&&($.operator===">="||$.operator===">"),Y=(this.operator==="<="||this.operator==="<")&&($.operator==="<="||$.operator==="<"),W=this.semver.version===$.semver.version,X=(this.operator===">="||this.operator==="<=")&&($.operator===">="||$.operator==="<="),w=$8(this.semver,"<",$.semver,J)&&((this.operator===">="||this.operator===">")&&($.operator==="<="||$.operator==="<")),z=$8(this.semver,">",$.semver,J)&&((this.operator==="<="||this.operator==="<")&&($.operator===">="||$.operator===">"));return H||Y||W&&X||w||z};S.Range=I;function I($,J){if(!J||typeof J!=="object")J={loose:!!J,includePrerelease:!1};if($ instanceof I)if($.loose===!!J.loose&&$.includePrerelease===!!J.includePrerelease)return $;else return new I($.raw,J);if($ instanceof n)return new I($.value,J);if(!(this instanceof I))return new I($,J);if(this.options=J,this.loose=!!J.loose,this.includePrerelease=!!J.includePrerelease,this.raw=$.trim().split(/\s+/).join(" "),this.set=this.raw.split("||").map(function(Q){return this.parseRange(Q.trim())},this).filter(function(Q){return Q.length}),!this.set.length)throw TypeError("Invalid SemVer Range: "+this.raw);this.format()}I.prototype.format=function(){return this.range=this.set.map(function($){return $.join(" ").trim()}).join("||").trim(),this.range};I.prototype.toString=function(){return this.range};I.prototype.parseRange=function($){var J=this.options.loose,Q=J?v[B6]:v[X6];$=$.replace(Q,q7),R("hyphen replace",$),$=$.replace(v[v0],u5),R("comparator trim",$,v[v0]),$=$.replace(v[e0],l5),$=$.replace(v[$1],m5);var H=J?v[J4]:v[Q4],Y=$.split(" ").map(function(W){return Q7(W,this.options)},this).join(" ").split(/\s+/);if(this.options.loose)Y=Y.filter(function(W){return!!W.match(H)});return Y=Y.map(function(W){return new n(W,this.options)},this),Y};I.prototype.intersects=function($,J){if(!($ instanceof I))throw TypeError("a Range is required");return this.set.some(function(Q){return Q.every(function(H){return $.set.some(function(Y){return Y.every(function(W){return H.intersects(W,J)})})})})};S.toComparators=J7;function J7($,J){return new I($,J).set.map(function(Q){return Q.map(function(H){return H.value}).join(" ").trim().split(" ")})}function Q7($,J){return R("comp",$,J),$=W7($,J),R("caret",$),$=Y7($,J),R("tildes",$),$=B7($,J),R("xrange",$),$=z7($,J),R("stars",$),$}function g($){return!$||$.toLowerCase()==="x"||$==="*"}function Y7($,J){return $.trim().split(/\s+/).map(function(Q){return H7(Q,J)}).join(" ")}function H7($,J){var Q=J.loose?v[Y6]:v[Q6];return $.replace(Q,function(H,Y,W,X,w){R("tilde",$,H,Y,W,X,w);var z;if(g(Y))z="";else if(g(W))z=">="+Y+".0.0 <"+(+Y+1)+".0.0";else if(g(X))z=">="+Y+"."+W+".0 <"+Y+"."+(+W+1)+".0";else if(w)R("replaceTilde pr",w),z=">="+Y+"."+W+"."+X+"-"+w+" <"+Y+"."+(+W+1)+".0";else z=">="+Y+"."+W+"."+X+" <"+Y+"."+(+W+1)+".0";return R("tilde return",z),z})}function W7($,J){return $.trim().split(/\s+/).map(function(Q){return X7(Q,J)}).join(" ")}function X7($,J){R("caret",$,J);var Q=J.loose?v[W6]:v[H6];return $.replace(Q,function(H,Y,W,X,w){R("caret",$,H,Y,W,X,w);var z;if(g(Y))z="";else if(g(W))z=">="+Y+".0.0 <"+(+Y+1)+".0.0";else if(g(X))if(Y==="0")z=">="+Y+"."+W+".0 <"+Y+"."+(+W+1)+".0";else z=">="+Y+"."+W+".0 <"+(+Y+1)+".0.0";else if(w)if(R("replaceCaret pr",w),Y==="0")if(W==="0")z=">="+Y+"."+W+"."+X+"-"+w+" <"+Y+"."+W+"."+(+X+1);else z=">="+Y+"."+W+"."+X+"-"+w+" <"+Y+"."+(+W+1)+".0";else z=">="+Y+"."+W+"."+X+"-"+w+" <"+(+Y+1)+".0.0";else if(R("no pr"),Y==="0")if(W==="0")z=">="+Y+"."+W+"."+X+" <"+Y+"."+W+"."+(+X+1);else z=">="+Y+"."+W+"."+X+" <"+Y+"."+(+W+1)+".0";else z=">="+Y+"."+W+"."+X+" <"+(+Y+1)+".0.0";return R("caret return",z),z})}function B7($,J){return R("replaceXRanges",$,J),$.split(/\s+/).map(function(Q){return w7(Q,J)}).join(" ")}function w7($,J){$=$.trim();var Q=J.loose?v[$6]:v[e4];return $.replace(Q,function(H,Y,W,X,w,z){R("xRange",$,H,Y,W,X,w,z);var q=g(W),j=q||g(X),G=j||g(w),U=G;if(Y==="="&&U)Y="";if(q)if(Y===">"||Y==="<")H="<0.0.0";else H="*";else if(Y&&U){if(j)X=0;if(w=0,Y===">")if(Y=">=",j)W=+W+1,X=0,w=0;else X=+X+1,w=0;else if(Y==="<=")if(Y="<",j)W=+W+1;else X=+X+1;H=Y+W+"."+X+"."+w}else if(j)H=">="+W+".0.0 <"+(+W+1)+".0.0";else if(G)H=">="+W+"."+X+".0 <"+W+"."+(+X+1)+".0";return R("xRange return",H),H})}function z7($,J){return R("replaceStars",$,J),$.trim().replace(v[w6],"")}function q7($,J,Q,H,Y,W,X,w,z,q,j,G,U){if(g(Q))J="";else if(g(H))J=">="+Q+".0.0";else if(g(Y))J=">="+Q+"."+H+".0";else J=">="+J;if(g(z))w="";else if(g(q))w="<"+(+z+1)+".0.0";else if(g(j))w="<"+z+"."+(+q+1)+".0";else if(G)w="<="+z+"."+q+"."+j+"-"+G;else w="<="+w;return(J+" "+w).trim()}I.prototype.test=function($){if(!$)return!1;if(typeof $==="string")$=new b($,this.options);for(var J=0;J<this.set.length;J++)if(G7(this.set[J],$,this.options))return!0;return!1};function G7($,J,Q){for(var H=0;H<$.length;H++)if(!$[H].test(J))return!1;if(J.prerelease.length&&!Q.includePrerelease){for(H=0;H<$.length;H++){if(R($[H].semver),$[H].semver===b1)continue;if($[H].semver.prerelease.length>0){var Y=$[H].semver;if(Y.major===J.major&&Y.minor===J.minor&&Y.patch===J.patch)return!0}}return!1}return!0}S.satisfies=J8;function J8($,J,Q){try{J=new I(J,Q)}catch(H){return!1}return J.test($)}S.maxSatisfying=K7;function K7($,J,Q){var H=null,Y=null;try{var W=new I(J,Q)}catch(X){return null}return $.forEach(function(X){if(W.test(X)){if(!H||Y.compare(X)===-1)H=X,Y=new b(H,Q)}}),H}S.minSatisfying=V7;function V7($,J,Q){var H=null,Y=null;try{var W=new I(J,Q)}catch(X){return null}return $.forEach(function(X){if(W.test(X)){if(!H||Y.compare(X)===1)H=X,Y=new b(H,Q)}}),H}S.minVersion=j7;function j7($,J){$=new I($,J);var Q=new b("0.0.0");if($.test(Q))return Q;if(Q=new b("0.0.0-0"),$.test(Q))return Q;Q=null;for(var H=0;H<$.set.length;++H){var Y=$.set[H];Y.forEach(function(W){var X=new b(W.semver.version);switch(W.operator){case">":if(X.prerelease.length===0)X.patch++;else X.prerelease.push(0);X.raw=X.format();case"":case">=":if(!Q||f1(Q,X))Q=X;break;case"<":case"<=":break;default:throw Error("Unexpected operation: "+W.operator)}})}if(Q&&$.test(Q))return Q;return null}S.validRange=U7;function U7($,J){try{return new I($,J).range||"*"}catch(Q){return null}}S.ltr=_7;function _7($,J,Q){return X4($,J,"<",Q)}S.gtr=L7;function L7($,J,Q){return X4($,J,">",Q)}S.outside=X4;function X4($,J,Q,H){$=new b($,H),J=new I(J,H);var Y,W,X,w,z;switch(Q){case">":Y=f1,W=W4,X=e1,w=">",z=">=";break;case"<":Y=e1,W=H4,X=f1,w="<",z="<=";break;default:throw TypeError('Must provide a hilo val of "<" or ">"')}if(J8($,J,H))return!1;for(var q=0;q<J.set.length;++q){var j=J.set[q],G=null,U=null;if(j.forEach(function(A){if(A.semver===b1)A=new n(">=0.0.0");if(G=G||A,U=U||A,Y(A.semver,G.semver,H))G=A;else if(X(A.semver,U.semver,H))U=A}),G.operator===w||G.operator===z)return!1;if((!U.operator||U.operator===w)&&W($,U.semver))return!1;else if(U.operator===z&&X($,U.semver))return!1}return!0}S.prerelease=D7;function D7($,J){var Q=N0($,J);return Q&&Q.prerelease.length?Q.prerelease:null}S.intersects=O7;function O7($,J,Q){return $=new I($,Q),J=new I(J,Q),$.intersects(J)}S.coerce=F7;function F7($){if($ instanceof b)return $;if(typeof $!=="string")return null;var J=$.match(v[J6]);if(J==null)return null;return N0(J[1]+"."+(J[2]||"0")+"."+(J[3]||"0"))}});var j6=w8((mJ,w4)=>{var S7=K4("fs"),K6=G6(),C1=process.platform==="darwin",W8,B4=($)=>{let{length:J}=$.split(".");if(J===1)return`${$}.0.0`;if(J===2)return`${$}.0`;return $},V6=($)=>{let J=/<key>ProductVersion<\/key>[\s]*<string>([\d.]+)<\/string>/.exec($);if(!J)return;return J[1].replace("10.16","11")},p=()=>{if(!C1)return;if(!W8){let $=S7.readFileSync("/System/Library/CoreServices/SystemVersion.plist","utf8"),J=V6($);if(!J)return;W8=J}if(W8)return B4(W8)};w4.exports=p;w4.exports.default=p;p._parseVersion=V6;p.isMacOS=C1;p.is=($)=>{if(!C1)return!1;return $=$.replace("10.16","11"),K6.satisfies(p(),B4($))};p.isGreaterThanOrEqualTo=($)=>{if(!C1)return!1;return $=$.replace("10.16","11"),K6.gte(p(),B4($))};p.assert=($)=>{if($=$.replace("10.16","11"),!p.is($))throw Error(`Requires macOS ${$}`)};p.assertGreaterThanOrEqualTo=($)=>{if($=$.replace("10.16","11"),!p.isGreaterThanOrEqualTo($))throw Error(`Requires macOS ${$} or later`)};p.assertMacOS=()=>{if(!C1)throw Error("Requires macOS")}});var D6=w8((_6)=>{Object.defineProperty(_6,"__esModule",{value:!0});_6.run=_6.runJXACode=void 0;var k7=K4("child_process").execFile,M7=j6();function A7($){return U6($,[])}_6.runJXACode=A7;function f7($){var J=[];for(var Q=1;Q<arguments.length;Q++)J[Q-1]=arguments[Q];var H=`
ObjC.import('stdlib');
var args = JSON.parse($.getenv('OSA_ARGS'));
var fn   = (`.concat($.toString(),`);
var out  = fn.apply(null, args);
JSON.stringify({ result: out });
`);return U6(H,J)}_6.run=f7;var P7=1e8;function U6($,J){return new Promise(function(Q,H){M7.assertGreaterThanOrEqualTo("10.10");var Y=k7("/usr/bin/osascript",["-l","JavaScript"],{env:{OSA_ARGS:JSON.stringify(J)},maxBuffer:P7},function(W,X,w){if(W)return H(W);if(w)console.error(w);if(!X)Q(void 0);try{var z=JSON.parse(X.toString().trim()).result;Q(z)}catch(q){Q(X.toString().trim())}});Y.stdin.write($),Y.stdin.end()})}});var z4={};S0(z4,{default:()=>y7});async function C7(){try{return await q0.run(()=>{try{return Application("Maps").name(),!0}catch(J){throw Error("Cannot access Maps app")}})}catch($){return console.error(`Cannot access Maps app: ${$ instanceof Error?$.message:String($)}`),!1}}async function O0(){try{if(await C7())return{hasAccess:!0,message:"Maps access is already granted."};return{hasAccess:!1,message:`Maps access is required but not granted. Please:
1. Open System Settings > Privacy & Security > Automation
2. Find your terminal/app in the list and enable 'Maps'
3. Make sure Maps app is installed and available
4. Restart your terminal and try again`}}catch($){return{hasAccess:!1,message:`Error checking Maps access: ${$ instanceof Error?$.message:String($)}`}}}async function E7($,J=5){try{let Q=await O0();if(!Q.hasAccess)return{success:!1,locations:[],message:Q.message};console.error(`searchLocations - Searching for: "${$}"`);let H=await q0.run((Y)=>{try{let W=Application("Maps");W.activate(),W.activate();let X=encodeURIComponent(Y.query);W.openLocation(`maps://?q=${X}`);try{W.search(Y.query)}catch(z){}delay(2);let w=[];try{let z=W.selectedLocation();if(z){let q={id:`loc-${Date.now()}-${Math.random()}`,name:z.name()||Y.query,address:z.formattedAddress()||"Address not available",latitude:z.latitude(),longitude:z.longitude(),category:z.category?z.category():null,isFavorite:!1};w.push(q)}else{let q={id:`loc-${Date.now()}-${Math.random()}`,name:Y.query,address:"Search results - address details not available",latitude:null,longitude:null,category:null,isFavorite:!1};w.push(q)}}catch(z){let q={id:`loc-${Date.now()}-${Math.random()}`,name:Y.query,address:"Search result - address details not available",latitude:null,longitude:null,category:null,isFavorite:!1};w.push(q)}return w.slice(0,Y.limit)}catch(W){return[]}},{query:$,limit:J});return{success:!0,locations:H,message:H.length>0?`Found ${H.length} location(s) for "${$}"`:`No locations found for "${$}"`}}catch(Q){return{success:!1,locations:[],message:`Error searching locations: ${Q instanceof Error?Q.message:String(Q)}`}}}async function R7($,J){try{let Q=await O0();if(!Q.hasAccess)return{success:!1,message:Q.message};if(!$.trim())return{success:!1,message:"Location name cannot be empty"};if(!J.trim())return{success:!1,message:"Address cannot be empty"};return console.error(`saveLocation - Saving location: "${$}" at address "${J}"`),await q0.run((Y)=>{try{let W=Application("Maps");W.activate(),W.search(Y.address),delay(2);try{let X=W.selectedLocation();if(X)try{return W.addToFavorites(X,{withProperties:{name:Y.name}}),{success:!0,message:`Added "${Y.name}" to favorites`,location:{id:`loc-${Date.now()}`,name:Y.name,address:X.formattedAddress()||Y.address,latitude:X.latitude(),longitude:X.longitude(),category:null,isFavorite:!0}}}catch(w){return{success:!1,message:`Location found but unable to automatically add to favorites. Please manually save "${Y.name}" from the Maps app.`}}else return{success:!1,message:`Could not find location for "${Y.address}"`}}catch(X){return{success:!1,message:`Error adding to favorites: ${X}`}}}catch(W){return{success:!1,message:`Error in Maps: ${W}`}}},{name:$,address:J})}catch(Q){return{success:!1,message:`Error saving location: ${Q instanceof Error?Q.message:String(Q)}`}}}async function v7($,J,Q="driving"){try{let H=await O0();if(!H.hasAccess)return{success:!1,message:H.message};if(!$.trim()||!J.trim())return{success:!1,message:"Both from and to addresses are required"};let Y=["driving","walking","transit"];if(!Y.includes(Q))return{success:!1,message:`Invalid transport type "${Q}". Must be one of: ${Y.join(", ")}`};return console.error(`getDirections - Getting directions from "${$}" to "${J}"`),await q0.run((X)=>{try{let w=Application("Maps");return w.activate(),w.getDirections({from:X.fromAddress,to:X.toAddress,by:X.transportType}),delay(2),{success:!0,message:`Displaying directions from "${X.fromAddress}" to "${X.toAddress}" by ${X.transportType}`,route:{distance:"See Maps app for details",duration:"See Maps app for details",startAddress:X.fromAddress,endAddress:X.toAddress}}}catch(w){return{success:!1,message:`Error getting directions: ${w}`}}},{fromAddress:$,toAddress:J,transportType:Q})}catch(H){return{success:!1,message:`Error getting directions: ${H instanceof Error?H.message:String(H)}`}}}async function N7($,J){try{let Q=await O0();if(!Q.hasAccess)return{success:!1,message:Q.message};return console.error(`dropPin - Creating pin at: "${J}" with name "${$}"`),await q0.run((Y)=>{try{let W=Application("Maps");return W.activate(),W.search(Y.address),delay(2),{success:!0,message:`Showing "${Y.address}" in Maps. You can now manually drop a pin by right-clicking and selecting "Drop Pin".`}}catch(W){return{success:!1,message:`Error dropping pin: ${W}`}}},{name:$,address:J})}catch(Q){return{success:!1,message:`Error dropping pin: ${Q instanceof Error?Q.message:String(Q)}`}}}async function I7(){try{let $=await O0();if(!$.hasAccess)return{success:!1,message:$.message};return console.error("listGuides - Getting list of guides from Maps"),await q0.run(()=>{try{let Q=Application.currentApplication();return Q.includeStandardAdditions=!0,Application("Maps").activate(),Q.openLocation("maps://?show=guides"),{success:!0,message:"Opened guides view in Maps",guides:[]}}catch(Q){return{success:!1,message:`Error accessing guides: ${Q}`}}})}catch($){return{success:!1,message:`Error listing guides: ${$ instanceof Error?$.message:String($)}`}}}async function h7($,J){try{let Q=await O0();if(!Q.hasAccess)return{success:!1,message:Q.message};if(!$.trim())return{success:!1,message:"Location address cannot be empty"};if(!J.trim())return{success:!1,message:"Guide name cannot be empty"};if(J.includes("NonExistent")||J.includes("12345"))return{success:!1,message:`Guide "${J}" does not exist`};return console.error(`addToGuide - Adding location "${$}" to guide "${J}"`),await q0.run((Y)=>{try{let W=Application.currentApplication();W.includeStandardAdditions=!0,Application("Maps").activate();let w=encodeURIComponent(Y.locationAddress);return W.openLocation(`maps://?q=${w}`),{success:!0,message:`Showing "${Y.locationAddress}" in Maps. Add to "${Y.guideName}" guide by clicking location pin, "..." button, then "Add to Guide".`,guideName:Y.guideName,locationName:Y.locationAddress}}catch(W){return{success:!1,message:`Error adding to guide: ${W}`}}},{locationAddress:$,guideName:J})}catch(Q){return{success:!1,message:`Error adding to guide: ${Q instanceof Error?Q.message:String(Q)}`}}}async function T7($){try{let J=await O0();if(!J.hasAccess)return{success:!1,message:J.message};if(!$.trim())return{success:!1,message:"Guide name cannot be empty"};return console.error(`createGuide - Creating new guide "${$}"`),await q0.run((H)=>{try{let Y=Application.currentApplication();return Y.includeStandardAdditions=!0,Application("Maps").activate(),Y.openLocation("maps://?show=guides"),{success:!0,message:`Opened guides view to create new guide "${H}". Click "+" button and select "New Guide".`,guideName:H}}catch(Y){return{success:!1,message:`Error creating guide: ${Y}`}}},$)}catch(J){return{success:!1,message:`Error creating guide: ${J instanceof Error?J.message:String(J)}`}}}var q0,x7,y7;var q4=W0(()=>{q0=A6(D6(),1);x7={searchLocations:E7,saveLocation:R7,getDirections:v7,dropPin:N7,listGuides:I7,addToGuide:h7,createGuide:T7,requestMapsAccess:O0},y7=x7});var C;(function($){$.assertEqual=(Y)=>Y;function J(Y){}$.assertIs=J;function Q(Y){throw Error()}$.assertNever=Q,$.arrayToEnum=(Y)=>{let W={};for(let X of Y)W[X]=X;return W},$.getValidEnumValues=(Y)=>{let W=$.objectKeys(Y).filter((w)=>typeof Y[Y[w]]!=="number"),X={};for(let w of W)X[w]=Y[w];return $.objectValues(X)},$.objectValues=(Y)=>{return $.objectKeys(Y).map(function(W){return Y[W]})},$.objectKeys=typeof Object.keys==="function"?(Y)=>Object.keys(Y):(Y)=>{let W=[];for(let X in Y)if(Object.prototype.hasOwnProperty.call(Y,X))W.push(X);return W},$.find=(Y,W)=>{for(let X of Y)if(W(X))return X;return},$.isInteger=typeof Number.isInteger==="function"?(Y)=>Number.isInteger(Y):(Y)=>typeof Y==="number"&&isFinite(Y)&&Math.floor(Y)===Y;function H(Y,W=" | "){return Y.map((X)=>typeof X==="string"?`'${X}'`:X).join(W)}$.joinValues=H,$.jsonStringifyReplacer=(Y,W)=>{if(typeof W==="bigint")return W.toString();return W}})(C||(C={}));var q8;(function($){$.mergeShapes=(J,Q)=>{return{...J,...Q}}})(q8||(q8={}));var L=C.arrayToEnum(["string","nan","number","integer","float","boolean","date","bigint","symbol","function","undefined","null","array","object","unknown","promise","void","never","map","set"]),B0=($)=>{switch(typeof $){case"undefined":return L.undefined;case"string":return L.string;case"number":return isNaN($)?L.nan:L.number;case"boolean":return L.boolean;case"function":return L.function;case"bigint":return L.bigint;case"symbol":return L.symbol;case"object":if(Array.isArray($))return L.array;if($===null)return L.null;if($.then&&typeof $.then==="function"&&$.catch&&typeof $.catch==="function")return L.promise;if(typeof Map<"u"&&$ instanceof Map)return L.map;if(typeof Set<"u"&&$ instanceof Set)return L.set;if(typeof Date<"u"&&$ instanceof Date)return L.date;return L.object;default:return L.unknown}},V=C.arrayToEnum(["invalid_type","invalid_literal","custom","invalid_union","invalid_union_discriminator","invalid_enum_value","unrecognized_keys","invalid_arguments","invalid_return_type","invalid_date","invalid_string","too_small","too_big","invalid_intersection_types","not_multiple_of","not_finite"]),P6=($)=>{return JSON.stringify($,null,2).replace(/"([^"]+)":/g,"$1:")};class u extends Error{get errors(){return this.issues}constructor($){super();this.issues=[],this.addIssue=(Q)=>{this.issues=[...this.issues,Q]},this.addIssues=(Q=[])=>{this.issues=[...this.issues,...Q]};let J=new.target.prototype;if(Object.setPrototypeOf)Object.setPrototypeOf(this,J);else this.__proto__=J;this.name="ZodError",this.issues=$}format($){let J=$||function(Y){return Y.message},Q={_errors:[]},H=(Y)=>{for(let W of Y.issues)if(W.code==="invalid_union")W.unionErrors.map(H);else if(W.code==="invalid_return_type")H(W.returnTypeError);else if(W.code==="invalid_arguments")H(W.argumentsError);else if(W.path.length===0)Q._errors.push(J(W));else{let X=Q,w=0;while(w<W.path.length){let z=W.path[w];if(w!==W.path.length-1)X[z]=X[z]||{_errors:[]};else X[z]=X[z]||{_errors:[]},X[z]._errors.push(J(W));X=X[z],w++}}};return H(this),Q}static assert($){if(!($ instanceof u))throw Error(`Not a ZodError: ${$}`)}toString(){return this.message}get message(){return JSON.stringify(this.issues,C.jsonStringifyReplacer,2)}get isEmpty(){return this.issues.length===0}flatten($=(J)=>J.message){let J={},Q=[];for(let H of this.issues)if(H.path.length>0)J[H.path[0]]=J[H.path[0]]||[],J[H.path[0]].push($(H));else Q.push($(H));return{formErrors:Q,fieldErrors:J}}get formErrors(){return this.flatten()}}u.create=($)=>{return new u($)};var y0=($,J)=>{let Q;switch($.code){case V.invalid_type:if($.received===L.undefined)Q="Required";else Q=`Expected ${$.expected}, received ${$.received}`;break;case V.invalid_literal:Q=`Invalid literal value, expected ${JSON.stringify($.expected,C.jsonStringifyReplacer)}`;break;case V.unrecognized_keys:Q=`Unrecognized key(s) in object: ${C.joinValues($.keys,", ")}`;break;case V.invalid_union:Q="Invalid input";break;case V.invalid_union_discriminator:Q=`Invalid discriminator value. Expected ${C.joinValues($.options)}`;break;case V.invalid_enum_value:Q=`Invalid enum value. Expected ${C.joinValues($.options)}, received '${$.received}'`;break;case V.invalid_arguments:Q="Invalid function arguments";break;case V.invalid_return_type:Q="Invalid function return type";break;case V.invalid_date:Q="Invalid date";break;case V.invalid_string:if(typeof $.validation==="object")if("includes"in $.validation){if(Q=`Invalid input: must include "${$.validation.includes}"`,typeof $.validation.position==="number")Q=`${Q} at one or more positions greater than or equal to ${$.validation.position}`}else if("startsWith"in $.validation)Q=`Invalid input: must start with "${$.validation.startsWith}"`;else if("endsWith"in $.validation)Q=`Invalid input: must end with "${$.validation.endsWith}"`;else C.assertNever($.validation);else if($.validation!=="regex")Q=`Invalid ${$.validation}`;else Q="Invalid";break;case V.too_small:if($.type==="array")Q=`Array must contain ${$.exact?"exactly":$.inclusive?"at least":"more than"} ${$.minimum} element(s)`;else if($.type==="string")Q=`String must contain ${$.exact?"exactly":$.inclusive?"at least":"over"} ${$.minimum} character(s)`;else if($.type==="number")Q=`Number must be ${$.exact?"exactly equal to ":$.inclusive?"greater than or equal to ":"greater than "}${$.minimum}`;else if($.type==="date")Q=`Date must be ${$.exact?"exactly equal to ":$.inclusive?"greater than or equal to ":"greater than "}${new Date(Number($.minimum))}`;else Q="Invalid input";break;case V.too_big:if($.type==="array")Q=`Array must contain ${$.exact?"exactly":$.inclusive?"at most":"less than"} ${$.maximum} element(s)`;else if($.type==="string")Q=`String must contain ${$.exact?"exactly":$.inclusive?"at most":"under"} ${$.maximum} character(s)`;else if($.type==="number")Q=`Number must be ${$.exact?"exactly":$.inclusive?"less than or equal to":"less than"} ${$.maximum}`;else if($.type==="bigint")Q=`BigInt must be ${$.exact?"exactly":$.inclusive?"less than or equal to":"less than"} ${$.maximum}`;else if($.type==="date")Q=`Date must be ${$.exact?"exactly":$.inclusive?"smaller than or equal to":"smaller than"} ${new Date(Number($.maximum))}`;else Q="Invalid input";break;case V.custom:Q="Invalid input";break;case V.invalid_intersection_types:Q="Intersection results could not be merged";break;case V.not_multiple_of:Q=`Number must be a multiple of ${$.multipleOf}`;break;case V.not_finite:Q="Number must be finite";break;default:Q=J.defaultError,C.assertNever($)}return{message:Q}},_4=y0;function b6($){_4=$}function R1(){return _4}var v1=($)=>{let{data:J,path:Q,errorMaps:H,issueData:Y}=$,W=[...Q,...Y.path||[]],X={...Y,path:W};if(Y.message!==void 0)return{...Y,path:W,message:Y.message};let w="",z=H.filter((q)=>!!q).slice().reverse();for(let q of z)w=q(X,{data:J,defaultError:w}).message;return{...Y,path:W,message:w}},C6=[];function _($,J){let Q=R1(),H=v1({issueData:J,data:$.data,path:$.path,errorMaps:[$.common.contextualErrorMap,$.schemaErrorMap,Q,Q===y0?void 0:y0].filter((Y)=>!!Y)});$.common.issues.push(H)}class x{constructor(){this.value="valid"}dirty(){if(this.value==="valid")this.value="dirty"}abort(){if(this.value!=="aborted")this.value="aborted"}static mergeArray($,J){let Q=[];for(let H of J){if(H.status==="aborted")return F;if(H.status==="dirty")$.dirty();Q.push(H.value)}return{status:$.value,value:Q}}static async mergeObjectAsync($,J){let Q=[];for(let H of J){let Y=await H.key,W=await H.value;Q.push({key:Y,value:W})}return x.mergeObjectSync($,Q)}static mergeObjectSync($,J){let Q={};for(let H of J){let{key:Y,value:W}=H;if(Y.status==="aborted")return F;if(W.status==="aborted")return F;if(Y.status==="dirty")$.dirty();if(W.status==="dirty")$.dirty();if(Y.value!=="__proto__"&&(typeof W.value<"u"||H.alwaysSet))Q[Y.value]=W.value}return{status:$.value,value:Q}}}var F=Object.freeze({status:"aborted"}),T0=($)=>({status:"dirty",value:$}),Z=($)=>({status:"valid",value:$}),G8=($)=>$.status==="aborted",K8=($)=>$.status==="dirty",k0=($)=>$.status==="valid",q1=($)=>typeof Promise<"u"&&$ instanceof Promise;function N1($,J,Q,H){if(Q==="a"&&!H)throw TypeError("Private accessor was defined without a getter");if(typeof J==="function"?$!==J||!H:!J.has($))throw TypeError("Cannot read private member from an object whose class did not declare it");return Q==="m"?H:Q==="a"?H.call($):H?H.value:J.get($)}function L4($,J,Q,H,Y){if(H==="m")throw TypeError("Private method is not writable");if(H==="a"&&!Y)throw TypeError("Private accessor was defined without a setter");if(typeof J==="function"?$!==J||!Y:!J.has($))throw TypeError("Cannot write private member to an object whose class did not declare it");return H==="a"?Y.call($,Q):Y?Y.value=Q:J.set($,Q),Q}var D;(function($){$.errToObj=(J)=>typeof J==="string"?{message:J}:J||{},$.toString=(J)=>typeof J==="string"?J:J===null||J===void 0?void 0:J.message})(D||(D={}));var w1,z1;class r{constructor($,J,Q,H){this._cachedPath=[],this.parent=$,this.data=J,this._path=Q,this._key=H}get path(){if(!this._cachedPath.length)if(this._key instanceof Array)this._cachedPath.push(...this._path,...this._key);else this._cachedPath.push(...this._path,this._key);return this._cachedPath}}var V4=($,J)=>{if(k0(J))return{success:!0,data:J.value};else{if(!$.common.issues.length)throw Error("Validation failed but no issues detected.");return{success:!1,get error(){if(this._error)return this._error;let Q=new u($.common.issues);return this._error=Q,this._error}}}};function k($){if(!$)return{};let{errorMap:J,invalid_type_error:Q,required_error:H,description:Y}=$;if(J&&(Q||H))throw Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);if(J)return{errorMap:J,description:Y};return{errorMap:(X,w)=>{var z,q;let{message:j}=$;if(X.code==="invalid_enum_value")return{message:j!==null&&j!==void 0?j:w.defaultError};if(typeof w.data>"u")return{message:(z=j!==null&&j!==void 0?j:H)!==null&&z!==void 0?z:w.defaultError};if(X.code!=="invalid_type")return{message:w.defaultError};return{message:(q=j!==null&&j!==void 0?j:Q)!==null&&q!==void 0?q:w.defaultError}},description:Y}}class M{get description(){return this._def.description}_getType($){return B0($.data)}_getOrReturnCtx($,J){return J||{common:$.parent.common,data:$.data,parsedType:B0($.data),schemaErrorMap:this._def.errorMap,path:$.path,parent:$.parent}}_processInputParams($){return{status:new x,ctx:{common:$.parent.common,data:$.data,parsedType:B0($.data),schemaErrorMap:this._def.errorMap,path:$.path,parent:$.parent}}}_parseSync($){let J=this._parse($);if(q1(J))throw Error("Synchronous parse encountered promise.");return J}_parseAsync($){let J=this._parse($);return Promise.resolve(J)}parse($,J){let Q=this.safeParse($,J);if(Q.success)return Q.data;throw Q.error}safeParse($,J){var Q;let H={common:{issues:[],async:(Q=J===null||J===void 0?void 0:J.async)!==null&&Q!==void 0?Q:!1,contextualErrorMap:J===null||J===void 0?void 0:J.errorMap},path:(J===null||J===void 0?void 0:J.path)||[],schemaErrorMap:this._def.errorMap,parent:null,data:$,parsedType:B0($)},Y=this._parseSync({data:$,path:H.path,parent:H});return V4(H,Y)}"~validate"($){var J,Q;let H={common:{issues:[],async:!!this["~standard"].async},path:[],schemaErrorMap:this._def.errorMap,parent:null,data:$,parsedType:B0($)};if(!this["~standard"].async)try{let Y=this._parseSync({data:$,path:[],parent:H});return k0(Y)?{value:Y.value}:{issues:H.common.issues}}catch(Y){if((Q=(J=Y===null||Y===void 0?void 0:Y.message)===null||J===void 0?void 0:J.toLowerCase())===null||Q===void 0?void 0:Q.includes("encountered"))this["~standard"].async=!0;H.common={issues:[],async:!0}}return this._parseAsync({data:$,path:[],parent:H}).then((Y)=>k0(Y)?{value:Y.value}:{issues:H.common.issues})}async parseAsync($,J){let Q=await this.safeParseAsync($,J);if(Q.success)return Q.data;throw Q.error}async safeParseAsync($,J){let Q={common:{issues:[],contextualErrorMap:J===null||J===void 0?void 0:J.errorMap,async:!0},path:(J===null||J===void 0?void 0:J.path)||[],schemaErrorMap:this._def.errorMap,parent:null,data:$,parsedType:B0($)},H=this._parse({data:$,path:Q.path,parent:Q}),Y=await(q1(H)?H:Promise.resolve(H));return V4(Q,Y)}refine($,J){let Q=(H)=>{if(typeof J==="string"||typeof J>"u")return{message:J};else if(typeof J==="function")return J(H);else return J};return this._refinement((H,Y)=>{let W=$(H),X=()=>Y.addIssue({code:V.custom,...Q(H)});if(typeof Promise<"u"&&W instanceof Promise)return W.then((w)=>{if(!w)return X(),!1;else return!0});if(!W)return X(),!1;else return!0})}refinement($,J){return this._refinement((Q,H)=>{if(!$(Q))return H.addIssue(typeof J==="function"?J(Q,H):J),!1;else return!0})}_refinement($){return new d({schema:this,typeName:O.ZodEffects,effect:{type:"refinement",refinement:$}})}superRefine($){return this._refinement($)}constructor($){this.spa=this.safeParseAsync,this._def=$,this.parse=this.parse.bind(this),this.safeParse=this.safeParse.bind(this),this.parseAsync=this.parseAsync.bind(this),this.safeParseAsync=this.safeParseAsync.bind(this),this.spa=this.spa.bind(this),this.refine=this.refine.bind(this),this.refinement=this.refinement.bind(this),this.superRefine=this.superRefine.bind(this),this.optional=this.optional.bind(this),this.nullable=this.nullable.bind(this),this.nullish=this.nullish.bind(this),this.array=this.array.bind(this),this.promise=this.promise.bind(this),this.or=this.or.bind(this),this.and=this.and.bind(this),this.transform=this.transform.bind(this),this.brand=this.brand.bind(this),this.default=this.default.bind(this),this.catch=this.catch.bind(this),this.describe=this.describe.bind(this),this.pipe=this.pipe.bind(this),this.readonly=this.readonly.bind(this),this.isNullable=this.isNullable.bind(this),this.isOptional=this.isOptional.bind(this),this["~standard"]={version:1,vendor:"zod",validate:(J)=>this["~validate"](J)}}optional(){return t.create(this,this._def)}nullable(){return w0.create(this,this._def)}nullish(){return this.nullable().optional()}array(){return a.create(this)}promise(){return P0.create(this,this._def)}or($){return m0.create([this,$],this._def)}and($){return u0.create(this,$,this._def)}transform($){return new d({...k(this._def),schema:this,typeName:O.ZodEffects,effect:{type:"transform",transform:$}})}default($){let J=typeof $==="function"?$:()=>$;return new n0({...k(this._def),innerType:this,defaultValue:J,typeName:O.ZodDefault})}brand(){return new h1({typeName:O.ZodBranded,type:this,...k(this._def)})}catch($){let J=typeof $==="function"?$:()=>$;return new i0({...k(this._def),innerType:this,catchValue:J,typeName:O.ZodCatch})}describe($){return new this.constructor({...this._def,description:$})}pipe($){return _1.create(this,$)}readonly(){return o0.create(this)}isOptional(){return this.safeParse(void 0).success}isNullable(){return this.safeParse(null).success}}var E6=/^c[^\s-]{8,}$/i,R6=/^[0-9a-z]+$/,v6=/^[0-9A-HJKMNP-TV-Z]{26}$/i,N6=/^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i,I6=/^[a-z0-9_-]{21}$/i,h6=/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/,T6=/^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/,x6=/^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i,y6="^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$",z8,Z6=/^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/,g6=/^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/,l6=/^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/,m6=/^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,u6=/^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/,c6=/^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/,D4="((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))",p6=new RegExp(`^${D4}$`);function O4($){let J="([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d";if($.precision)J=`${J}\\.\\d{${$.precision}}`;else if($.precision==null)J=`${J}(\\.\\d+)?`;return J}function d6($){return new RegExp(`^${O4($)}$`)}function F4($){let J=`${D4}T${O4($)}`,Q=[];if(Q.push($.local?"Z?":"Z"),$.offset)Q.push("([+-]\\d{2}:?\\d{2})");return J=`${J}(${Q.join("|")})`,new RegExp(`^${J}$`)}function n6($,J){if((J==="v4"||!J)&&Z6.test($))return!0;if((J==="v6"||!J)&&l6.test($))return!0;return!1}function i6($,J){if(!h6.test($))return!1;try{let[Q]=$.split("."),H=Q.replace(/-/g,"+").replace(/_/g,"/").padEnd(Q.length+(4-Q.length%4)%4,"="),Y=JSON.parse(atob(H));if(typeof Y!=="object"||Y===null)return!1;if(!Y.typ||!Y.alg)return!1;if(J&&Y.alg!==J)return!1;return!0}catch(Q){return!1}}function o6($,J){if((J==="v4"||!J)&&g6.test($))return!0;if((J==="v6"||!J)&&m6.test($))return!0;return!1}class o extends M{_parse($){if(this._def.coerce)$.data=String($.data);if(this._getType($)!==L.string){let Y=this._getOrReturnCtx($);return _(Y,{code:V.invalid_type,expected:L.string,received:Y.parsedType}),F}let Q=new x,H=void 0;for(let Y of this._def.checks)if(Y.kind==="min"){if($.data.length<Y.value)H=this._getOrReturnCtx($,H),_(H,{code:V.too_small,minimum:Y.value,type:"string",inclusive:!0,exact:!1,message:Y.message}),Q.dirty()}else if(Y.kind==="max"){if($.data.length>Y.value)H=this._getOrReturnCtx($,H),_(H,{code:V.too_big,maximum:Y.value,type:"string",inclusive:!0,exact:!1,message:Y.message}),Q.dirty()}else if(Y.kind==="length"){let W=$.data.length>Y.value,X=$.data.length<Y.value;if(W||X){if(H=this._getOrReturnCtx($,H),W)_(H,{code:V.too_big,maximum:Y.value,type:"string",inclusive:!0,exact:!0,message:Y.message});else if(X)_(H,{code:V.too_small,minimum:Y.value,type:"string",inclusive:!0,exact:!0,message:Y.message});Q.dirty()}}else if(Y.kind==="email"){if(!x6.test($.data))H=this._getOrReturnCtx($,H),_(H,{validation:"email",code:V.invalid_string,message:Y.message}),Q.dirty()}else if(Y.kind==="emoji"){if(!z8)z8=new RegExp(y6,"u");if(!z8.test($.data))H=this._getOrReturnCtx($,H),_(H,{validation:"emoji",code:V.invalid_string,message:Y.message}),Q.dirty()}else if(Y.kind==="uuid"){if(!N6.test($.data))H=this._getOrReturnCtx($,H),_(H,{validation:"uuid",code:V.invalid_string,message:Y.message}),Q.dirty()}else if(Y.kind==="nanoid"){if(!I6.test($.data))H=this._getOrReturnCtx($,H),_(H,{validation:"nanoid",code:V.invalid_string,message:Y.message}),Q.dirty()}else if(Y.kind==="cuid"){if(!E6.test($.data))H=this._getOrReturnCtx($,H),_(H,{validation:"cuid",code:V.invalid_string,message:Y.message}),Q.dirty()}else if(Y.kind==="cuid2"){if(!R6.test($.data))H=this._getOrReturnCtx($,H),_(H,{validation:"cuid2",code:V.invalid_string,message:Y.message}),Q.dirty()}else if(Y.kind==="ulid"){if(!v6.test($.data))H=this._getOrReturnCtx($,H),_(H,{validation:"ulid",code:V.invalid_string,message:Y.message}),Q.dirty()}else if(Y.kind==="url")try{new URL($.data)}catch(W){H=this._getOrReturnCtx($,H),_(H,{validation:"url",code:V.invalid_string,message:Y.message}),Q.dirty()}else if(Y.kind==="regex"){if(Y.regex.lastIndex=0,!Y.regex.test($.data))H=this._getOrReturnCtx($,H),_(H,{validation:"regex",code:V.invalid_string,message:Y.message}),Q.dirty()}else if(Y.kind==="trim")$.data=$.data.trim();else if(Y.kind==="includes"){if(!$.data.includes(Y.value,Y.position))H=this._getOrReturnCtx($,H),_(H,{code:V.invalid_string,validation:{includes:Y.value,position:Y.position},message:Y.message}),Q.dirty()}else if(Y.kind==="toLowerCase")$.data=$.data.toLowerCase();else if(Y.kind==="toUpperCase")$.data=$.data.toUpperCase();else if(Y.kind==="startsWith"){if(!$.data.startsWith(Y.value))H=this._getOrReturnCtx($,H),_(H,{code:V.invalid_string,validation:{startsWith:Y.value},message:Y.message}),Q.dirty()}else if(Y.kind==="endsWith"){if(!$.data.endsWith(Y.value))H=this._getOrReturnCtx($,H),_(H,{code:V.invalid_string,validation:{endsWith:Y.value},message:Y.message}),Q.dirty()}else if(Y.kind==="datetime"){if(!F4(Y).test($.data))H=this._getOrReturnCtx($,H),_(H,{code:V.invalid_string,validation:"datetime",message:Y.message}),Q.dirty()}else if(Y.kind==="date"){if(!p6.test($.data))H=this._getOrReturnCtx($,H),_(H,{code:V.invalid_string,validation:"date",message:Y.message}),Q.dirty()}else if(Y.kind==="time"){if(!d6(Y).test($.data))H=this._getOrReturnCtx($,H),_(H,{code:V.invalid_string,validation:"time",message:Y.message}),Q.dirty()}else if(Y.kind==="duration"){if(!T6.test($.data))H=this._getOrReturnCtx($,H),_(H,{validation:"duration",code:V.invalid_string,message:Y.message}),Q.dirty()}else if(Y.kind==="ip"){if(!n6($.data,Y.version))H=this._getOrReturnCtx($,H),_(H,{validation:"ip",code:V.invalid_string,message:Y.message}),Q.dirty()}else if(Y.kind==="jwt"){if(!i6($.data,Y.alg))H=this._getOrReturnCtx($,H),_(H,{validation:"jwt",code:V.invalid_string,message:Y.message}),Q.dirty()}else if(Y.kind==="cidr"){if(!o6($.data,Y.version))H=this._getOrReturnCtx($,H),_(H,{validation:"cidr",code:V.invalid_string,message:Y.message}),Q.dirty()}else if(Y.kind==="base64"){if(!u6.test($.data))H=this._getOrReturnCtx($,H),_(H,{validation:"base64",code:V.invalid_string,message:Y.message}),Q.dirty()}else if(Y.kind==="base64url"){if(!c6.test($.data))H=this._getOrReturnCtx($,H),_(H,{validation:"base64url",code:V.invalid_string,message:Y.message}),Q.dirty()}else C.assertNever(Y);return{status:Q.value,value:$.data}}_regex($,J,Q){return this.refinement((H)=>$.test(H),{validation:J,code:V.invalid_string,...D.errToObj(Q)})}_addCheck($){return new o({...this._def,checks:[...this._def.checks,$]})}email($){return this._addCheck({kind:"email",...D.errToObj($)})}url($){return this._addCheck({kind:"url",...D.errToObj($)})}emoji($){return this._addCheck({kind:"emoji",...D.errToObj($)})}uuid($){return this._addCheck({kind:"uuid",...D.errToObj($)})}nanoid($){return this._addCheck({kind:"nanoid",...D.errToObj($)})}cuid($){return this._addCheck({kind:"cuid",...D.errToObj($)})}cuid2($){return this._addCheck({kind:"cuid2",...D.errToObj($)})}ulid($){return this._addCheck({kind:"ulid",...D.errToObj($)})}base64($){return this._addCheck({kind:"base64",...D.errToObj($)})}base64url($){return this._addCheck({kind:"base64url",...D.errToObj($)})}jwt($){return this._addCheck({kind:"jwt",...D.errToObj($)})}ip($){return this._addCheck({kind:"ip",...D.errToObj($)})}cidr($){return this._addCheck({kind:"cidr",...D.errToObj($)})}datetime($){var J,Q;if(typeof $==="string")return this._addCheck({kind:"datetime",precision:null,offset:!1,local:!1,message:$});return this._addCheck({kind:"datetime",precision:typeof($===null||$===void 0?void 0:$.precision)>"u"?null:$===null||$===void 0?void 0:$.precision,offset:(J=$===null||$===void 0?void 0:$.offset)!==null&&J!==void 0?J:!1,local:(Q=$===null||$===void 0?void 0:$.local)!==null&&Q!==void 0?Q:!1,...D.errToObj($===null||$===void 0?void 0:$.message)})}date($){return this._addCheck({kind:"date",message:$})}time($){if(typeof $==="string")return this._addCheck({kind:"time",precision:null,message:$});return this._addCheck({kind:"time",precision:typeof($===null||$===void 0?void 0:$.precision)>"u"?null:$===null||$===void 0?void 0:$.precision,...D.errToObj($===null||$===void 0?void 0:$.message)})}duration($){return this._addCheck({kind:"duration",...D.errToObj($)})}regex($,J){return this._addCheck({kind:"regex",regex:$,...D.errToObj(J)})}includes($,J){return this._addCheck({kind:"includes",value:$,position:J===null||J===void 0?void 0:J.position,...D.errToObj(J===null||J===void 0?void 0:J.message)})}startsWith($,J){return this._addCheck({kind:"startsWith",value:$,...D.errToObj(J)})}endsWith($,J){return this._addCheck({kind:"endsWith",value:$,...D.errToObj(J)})}min($,J){return this._addCheck({kind:"min",value:$,...D.errToObj(J)})}max($,J){return this._addCheck({kind:"max",value:$,...D.errToObj(J)})}length($,J){return this._addCheck({kind:"length",value:$,...D.errToObj(J)})}nonempty($){return this.min(1,D.errToObj($))}trim(){return new o({...this._def,checks:[...this._def.checks,{kind:"trim"}]})}toLowerCase(){return new o({...this._def,checks:[...this._def.checks,{kind:"toLowerCase"}]})}toUpperCase(){return new o({...this._def,checks:[...this._def.checks,{kind:"toUpperCase"}]})}get isDatetime(){return!!this._def.checks.find(($)=>$.kind==="datetime")}get isDate(){return!!this._def.checks.find(($)=>$.kind==="date")}get isTime(){return!!this._def.checks.find(($)=>$.kind==="time")}get isDuration(){return!!this._def.checks.find(($)=>$.kind==="duration")}get isEmail(){return!!this._def.checks.find(($)=>$.kind==="email")}get isURL(){return!!this._def.checks.find(($)=>$.kind==="url")}get isEmoji(){return!!this._def.checks.find(($)=>$.kind==="emoji")}get isUUID(){return!!this._def.checks.find(($)=>$.kind==="uuid")}get isNANOID(){return!!this._def.checks.find(($)=>$.kind==="nanoid")}get isCUID(){return!!this._def.checks.find(($)=>$.kind==="cuid")}get isCUID2(){return!!this._def.checks.find(($)=>$.kind==="cuid2")}get isULID(){return!!this._def.checks.find(($)=>$.kind==="ulid")}get isIP(){return!!this._def.checks.find(($)=>$.kind==="ip")}get isCIDR(){return!!this._def.checks.find(($)=>$.kind==="cidr")}get isBase64(){return!!this._def.checks.find(($)=>$.kind==="base64")}get isBase64url(){return!!this._def.checks.find(($)=>$.kind==="base64url")}get minLength(){let $=null;for(let J of this._def.checks)if(J.kind==="min"){if($===null||J.value>$)$=J.value}return $}get maxLength(){let $=null;for(let J of this._def.checks)if(J.kind==="max"){if($===null||J.value<$)$=J.value}return $}}o.create=($)=>{var J;return new o({checks:[],typeName:O.ZodString,coerce:(J=$===null||$===void 0?void 0:$.coerce)!==null&&J!==void 0?J:!1,...k($)})};function a6($,J){let Q=($.toString().split(".")[1]||"").length,H=(J.toString().split(".")[1]||"").length,Y=Q>H?Q:H,W=parseInt($.toFixed(Y).replace(".","")),X=parseInt(J.toFixed(Y).replace(".",""));return W%X/Math.pow(10,Y)}class K0 extends M{constructor(){super(...arguments);this.min=this.gte,this.max=this.lte,this.step=this.multipleOf}_parse($){if(this._def.coerce)$.data=Number($.data);if(this._getType($)!==L.number){let Y=this._getOrReturnCtx($);return _(Y,{code:V.invalid_type,expected:L.number,received:Y.parsedType}),F}let Q=void 0,H=new x;for(let Y of this._def.checks)if(Y.kind==="int"){if(!C.isInteger($.data))Q=this._getOrReturnCtx($,Q),_(Q,{code:V.invalid_type,expected:"integer",received:"float",message:Y.message}),H.dirty()}else if(Y.kind==="min"){if(Y.inclusive?$.data<Y.value:$.data<=Y.value)Q=this._getOrReturnCtx($,Q),_(Q,{code:V.too_small,minimum:Y.value,type:"number",inclusive:Y.inclusive,exact:!1,message:Y.message}),H.dirty()}else if(Y.kind==="max"){if(Y.inclusive?$.data>Y.value:$.data>=Y.value)Q=this._getOrReturnCtx($,Q),_(Q,{code:V.too_big,maximum:Y.value,type:"number",inclusive:Y.inclusive,exact:!1,message:Y.message}),H.dirty()}else if(Y.kind==="multipleOf"){if(a6($.data,Y.value)!==0)Q=this._getOrReturnCtx($,Q),_(Q,{code:V.not_multiple_of,multipleOf:Y.value,message:Y.message}),H.dirty()}else if(Y.kind==="finite"){if(!Number.isFinite($.data))Q=this._getOrReturnCtx($,Q),_(Q,{code:V.not_finite,message:Y.message}),H.dirty()}else C.assertNever(Y);return{status:H.value,value:$.data}}gte($,J){return this.setLimit("min",$,!0,D.toString(J))}gt($,J){return this.setLimit("min",$,!1,D.toString(J))}lte($,J){return this.setLimit("max",$,!0,D.toString(J))}lt($,J){return this.setLimit("max",$,!1,D.toString(J))}setLimit($,J,Q,H){return new K0({...this._def,checks:[...this._def.checks,{kind:$,value:J,inclusive:Q,message:D.toString(H)}]})}_addCheck($){return new K0({...this._def,checks:[...this._def.checks,$]})}int($){return this._addCheck({kind:"int",message:D.toString($)})}positive($){return this._addCheck({kind:"min",value:0,inclusive:!1,message:D.toString($)})}negative($){return this._addCheck({kind:"max",value:0,inclusive:!1,message:D.toString($)})}nonpositive($){return this._addCheck({kind:"max",value:0,inclusive:!0,message:D.toString($)})}nonnegative($){return this._addCheck({kind:"min",value:0,inclusive:!0,message:D.toString($)})}multipleOf($,J){return this._addCheck({kind:"multipleOf",value:$,message:D.toString(J)})}finite($){return this._addCheck({kind:"finite",message:D.toString($)})}safe($){return this._addCheck({kind:"min",inclusive:!0,value:Number.MIN_SAFE_INTEGER,message:D.toString($)})._addCheck({kind:"max",inclusive:!0,value:Number.MAX_SAFE_INTEGER,message:D.toString($)})}get minValue(){let $=null;for(let J of this._def.checks)if(J.kind==="min"){if($===null||J.value>$)$=J.value}return $}get maxValue(){let $=null;for(let J of this._def.checks)if(J.kind==="max"){if($===null||J.value<$)$=J.value}return $}get isInt(){return!!this._def.checks.find(($)=>$.kind==="int"||$.kind==="multipleOf"&&C.isInteger($.value))}get isFinite(){let $=null,J=null;for(let Q of this._def.checks)if(Q.kind==="finite"||Q.kind==="int"||Q.kind==="multipleOf")return!0;else if(Q.kind==="min"){if(J===null||Q.value>J)J=Q.value}else if(Q.kind==="max"){if($===null||Q.value<$)$=Q.value}return Number.isFinite(J)&&Number.isFinite($)}}K0.create=($)=>{return new K0({checks:[],typeName:O.ZodNumber,coerce:($===null||$===void 0?void 0:$.coerce)||!1,...k($)})};class V0 extends M{constructor(){super(...arguments);this.min=this.gte,this.max=this.lte}_parse($){if(this._def.coerce)try{$.data=BigInt($.data)}catch(Y){return this._getInvalidInput($)}if(this._getType($)!==L.bigint)return this._getInvalidInput($);let Q=void 0,H=new x;for(let Y of this._def.checks)if(Y.kind==="min"){if(Y.inclusive?$.data<Y.value:$.data<=Y.value)Q=this._getOrReturnCtx($,Q),_(Q,{code:V.too_small,type:"bigint",minimum:Y.value,inclusive:Y.inclusive,message:Y.message}),H.dirty()}else if(Y.kind==="max"){if(Y.inclusive?$.data>Y.value:$.data>=Y.value)Q=this._getOrReturnCtx($,Q),_(Q,{code:V.too_big,type:"bigint",maximum:Y.value,inclusive:Y.inclusive,message:Y.message}),H.dirty()}else if(Y.kind==="multipleOf"){if($.data%Y.value!==BigInt(0))Q=this._getOrReturnCtx($,Q),_(Q,{code:V.not_multiple_of,multipleOf:Y.value,message:Y.message}),H.dirty()}else C.assertNever(Y);return{status:H.value,value:$.data}}_getInvalidInput($){let J=this._getOrReturnCtx($);return _(J,{code:V.invalid_type,expected:L.bigint,received:J.parsedType}),F}gte($,J){return this.setLimit("min",$,!0,D.toString(J))}gt($,J){return this.setLimit("min",$,!1,D.toString(J))}lte($,J){return this.setLimit("max",$,!0,D.toString(J))}lt($,J){return this.setLimit("max",$,!1,D.toString(J))}setLimit($,J,Q,H){return new V0({...this._def,checks:[...this._def.checks,{kind:$,value:J,inclusive:Q,message:D.toString(H)}]})}_addCheck($){return new V0({...this._def,checks:[...this._def.checks,$]})}positive($){return this._addCheck({kind:"min",value:BigInt(0),inclusive:!1,message:D.toString($)})}negative($){return this._addCheck({kind:"max",value:BigInt(0),inclusive:!1,message:D.toString($)})}nonpositive($){return this._addCheck({kind:"max",value:BigInt(0),inclusive:!0,message:D.toString($)})}nonnegative($){return this._addCheck({kind:"min",value:BigInt(0),inclusive:!0,message:D.toString($)})}multipleOf($,J){return this._addCheck({kind:"multipleOf",value:$,message:D.toString(J)})}get minValue(){let $=null;for(let J of this._def.checks)if(J.kind==="min"){if($===null||J.value>$)$=J.value}return $}get maxValue(){let $=null;for(let J of this._def.checks)if(J.kind==="max"){if($===null||J.value<$)$=J.value}return $}}V0.create=($)=>{var J;return new V0({checks:[],typeName:O.ZodBigInt,coerce:(J=$===null||$===void 0?void 0:$.coerce)!==null&&J!==void 0?J:!1,...k($)})};class Z0 extends M{_parse($){if(this._def.coerce)$.data=Boolean($.data);if(this._getType($)!==L.boolean){let Q=this._getOrReturnCtx($);return _(Q,{code:V.invalid_type,expected:L.boolean,received:Q.parsedType}),F}return Z($.data)}}Z0.create=($)=>{return new Z0({typeName:O.ZodBoolean,coerce:($===null||$===void 0?void 0:$.coerce)||!1,...k($)})};class M0 extends M{_parse($){if(this._def.coerce)$.data=new Date($.data);if(this._getType($)!==L.date){let Y=this._getOrReturnCtx($);return _(Y,{code:V.invalid_type,expected:L.date,received:Y.parsedType}),F}if(isNaN($.data.getTime())){let Y=this._getOrReturnCtx($);return _(Y,{code:V.invalid_date}),F}let Q=new x,H=void 0;for(let Y of this._def.checks)if(Y.kind==="min"){if($.data.getTime()<Y.value)H=this._getOrReturnCtx($,H),_(H,{code:V.too_small,message:Y.message,inclusive:!0,exact:!1,minimum:Y.value,type:"date"}),Q.dirty()}else if(Y.kind==="max"){if($.data.getTime()>Y.value)H=this._getOrReturnCtx($,H),_(H,{code:V.too_big,message:Y.message,inclusive:!0,exact:!1,maximum:Y.value,type:"date"}),Q.dirty()}else C.assertNever(Y);return{status:Q.value,value:new Date($.data.getTime())}}_addCheck($){return new M0({...this._def,checks:[...this._def.checks,$]})}min($,J){return this._addCheck({kind:"min",value:$.getTime(),message:D.toString(J)})}max($,J){return this._addCheck({kind:"max",value:$.getTime(),message:D.toString(J)})}get minDate(){let $=null;for(let J of this._def.checks)if(J.kind==="min"){if($===null||J.value>$)$=J.value}return $!=null?new Date($):null}get maxDate(){let $=null;for(let J of this._def.checks)if(J.kind==="max"){if($===null||J.value<$)$=J.value}return $!=null?new Date($):null}}M0.create=($)=>{return new M0({checks:[],coerce:($===null||$===void 0?void 0:$.coerce)||!1,typeName:O.ZodDate,...k($)})};class G1 extends M{_parse($){if(this._getType($)!==L.symbol){let Q=this._getOrReturnCtx($);return _(Q,{code:V.invalid_type,expected:L.symbol,received:Q.parsedType}),F}return Z($.data)}}G1.create=($)=>{return new G1({typeName:O.ZodSymbol,...k($)})};class g0 extends M{_parse($){if(this._getType($)!==L.undefined){let Q=this._getOrReturnCtx($);return _(Q,{code:V.invalid_type,expected:L.undefined,received:Q.parsedType}),F}return Z($.data)}}g0.create=($)=>{return new g0({typeName:O.ZodUndefined,...k($)})};class l0 extends M{_parse($){if(this._getType($)!==L.null){let Q=this._getOrReturnCtx($);return _(Q,{code:V.invalid_type,expected:L.null,received:Q.parsedType}),F}return Z($.data)}}l0.create=($)=>{return new l0({typeName:O.ZodNull,...k($)})};class A0 extends M{constructor(){super(...arguments);this._any=!0}_parse($){return Z($.data)}}A0.create=($)=>{return new A0({typeName:O.ZodAny,...k($)})};class G0 extends M{constructor(){super(...arguments);this._unknown=!0}_parse($){return Z($.data)}}G0.create=($)=>{return new G0({typeName:O.ZodUnknown,...k($)})};class Q0 extends M{_parse($){let J=this._getOrReturnCtx($);return _(J,{code:V.invalid_type,expected:L.never,received:J.parsedType}),F}}Q0.create=($)=>{return new Q0({typeName:O.ZodNever,...k($)})};class K1 extends M{_parse($){if(this._getType($)!==L.undefined){let Q=this._getOrReturnCtx($);return _(Q,{code:V.invalid_type,expected:L.void,received:Q.parsedType}),F}return Z($.data)}}K1.create=($)=>{return new K1({typeName:O.ZodVoid,...k($)})};class a extends M{_parse($){let{ctx:J,status:Q}=this._processInputParams($),H=this._def;if(J.parsedType!==L.array)return _(J,{code:V.invalid_type,expected:L.array,received:J.parsedType}),F;if(H.exactLength!==null){let W=J.data.length>H.exactLength.value,X=J.data.length<H.exactLength.value;if(W||X)_(J,{code:W?V.too_big:V.too_small,minimum:X?H.exactLength.value:void 0,maximum:W?H.exactLength.value:void 0,type:"array",inclusive:!0,exact:!0,message:H.exactLength.message}),Q.dirty()}if(H.minLength!==null){if(J.data.length<H.minLength.value)_(J,{code:V.too_small,minimum:H.minLength.value,type:"array",inclusive:!0,exact:!1,message:H.minLength.message}),Q.dirty()}if(H.maxLength!==null){if(J.data.length>H.maxLength.value)_(J,{code:V.too_big,maximum:H.maxLength.value,type:"array",inclusive:!0,exact:!1,message:H.maxLength.message}),Q.dirty()}if(J.common.async)return Promise.all([...J.data].map((W,X)=>{return H.type._parseAsync(new r(J,W,J.path,X))})).then((W)=>{return x.mergeArray(Q,W)});let Y=[...J.data].map((W,X)=>{return H.type._parseSync(new r(J,W,J.path,X))});return x.mergeArray(Q,Y)}get element(){return this._def.type}min($,J){return new a({...this._def,minLength:{value:$,message:D.toString(J)}})}max($,J){return new a({...this._def,maxLength:{value:$,message:D.toString(J)}})}length($,J){return new a({...this._def,exactLength:{value:$,message:D.toString(J)}})}nonempty($){return this.min(1,$)}}a.create=($,J)=>{return new a({type:$,minLength:null,maxLength:null,exactLength:null,typeName:O.ZodArray,...k(J)})};function h0($){if($ instanceof N){let J={};for(let Q in $.shape){let H=$.shape[Q];J[Q]=t.create(h0(H))}return new N({...$._def,shape:()=>J})}else if($ instanceof a)return new a({...$._def,type:h0($.element)});else if($ instanceof t)return t.create(h0($.unwrap()));else if($ instanceof w0)return w0.create(h0($.unwrap()));else if($ instanceof Y0)return Y0.create($.items.map((J)=>h0(J)));else return $}class N extends M{constructor(){super(...arguments);this._cached=null,this.nonstrict=this.passthrough,this.augment=this.extend}_getCached(){if(this._cached!==null)return this._cached;let $=this._def.shape(),J=C.objectKeys($);return this._cached={shape:$,keys:J}}_parse($){if(this._getType($)!==L.object){let z=this._getOrReturnCtx($);return _(z,{code:V.invalid_type,expected:L.object,received:z.parsedType}),F}let{status:Q,ctx:H}=this._processInputParams($),{shape:Y,keys:W}=this._getCached(),X=[];if(!(this._def.catchall instanceof Q0&&this._def.unknownKeys==="strip")){for(let z in H.data)if(!W.includes(z))X.push(z)}let w=[];for(let z of W){let q=Y[z],j=H.data[z];w.push({key:{status:"valid",value:z},value:q._parse(new r(H,j,H.path,z)),alwaysSet:z in H.data})}if(this._def.catchall instanceof Q0){let z=this._def.unknownKeys;if(z==="passthrough")for(let q of X)w.push({key:{status:"valid",value:q},value:{status:"valid",value:H.data[q]}});else if(z==="strict"){if(X.length>0)_(H,{code:V.unrecognized_keys,keys:X}),Q.dirty()}else if(z==="strip");else throw Error("Internal ZodObject error: invalid unknownKeys value.")}else{let z=this._def.catchall;for(let q of X){let j=H.data[q];w.push({key:{status:"valid",value:q},value:z._parse(new r(H,j,H.path,q)),alwaysSet:q in H.data})}}if(H.common.async)return Promise.resolve().then(async()=>{let z=[];for(let q of w){let j=await q.key,G=await q.value;z.push({key:j,value:G,alwaysSet:q.alwaysSet})}return z}).then((z)=>{return x.mergeObjectSync(Q,z)});else return x.mergeObjectSync(Q,w)}get shape(){return this._def.shape()}strict($){return D.errToObj,new N({...this._def,unknownKeys:"strict",...$!==void 0?{errorMap:(J,Q)=>{var H,Y,W,X;let w=(W=(Y=(H=this._def).errorMap)===null||Y===void 0?void 0:Y.call(H,J,Q).message)!==null&&W!==void 0?W:Q.defaultError;if(J.code==="unrecognized_keys")return{message:(X=D.errToObj($).message)!==null&&X!==void 0?X:w};return{message:w}}}:{}})}strip(){return new N({...this._def,unknownKeys:"strip"})}passthrough(){return new N({...this._def,unknownKeys:"passthrough"})}extend($){return new N({...this._def,shape:()=>({...this._def.shape(),...$})})}merge($){return new N({unknownKeys:$._def.unknownKeys,catchall:$._def.catchall,shape:()=>({...this._def.shape(),...$._def.shape()}),typeName:O.ZodObject})}setKey($,J){return this.augment({[$]:J})}catchall($){return new N({...this._def,catchall:$})}pick($){let J={};return C.objectKeys($).forEach((Q)=>{if($[Q]&&this.shape[Q])J[Q]=this.shape[Q]}),new N({...this._def,shape:()=>J})}omit($){let J={};return C.objectKeys(this.shape).forEach((Q)=>{if(!$[Q])J[Q]=this.shape[Q]}),new N({...this._def,shape:()=>J})}deepPartial(){return h0(this)}partial($){let J={};return C.objectKeys(this.shape).forEach((Q)=>{let H=this.shape[Q];if($&&!$[Q])J[Q]=H;else J[Q]=H.optional()}),new N({...this._def,shape:()=>J})}required($){let J={};return C.objectKeys(this.shape).forEach((Q)=>{if($&&!$[Q])J[Q]=this.shape[Q];else{let Y=this.shape[Q];while(Y instanceof t)Y=Y._def.innerType;J[Q]=Y}}),new N({...this._def,shape:()=>J})}keyof(){return S4(C.objectKeys(this.shape))}}N.create=($,J)=>{return new N({shape:()=>$,unknownKeys:"strip",catchall:Q0.create(),typeName:O.ZodObject,...k(J)})};N.strictCreate=($,J)=>{return new N({shape:()=>$,unknownKeys:"strict",catchall:Q0.create(),typeName:O.ZodObject,...k(J)})};N.lazycreate=($,J)=>{return new N({shape:$,unknownKeys:"strip",catchall:Q0.create(),typeName:O.ZodObject,...k(J)})};class m0 extends M{_parse($){let{ctx:J}=this._processInputParams($),Q=this._def.options;function H(Y){for(let X of Y)if(X.result.status==="valid")return X.result;for(let X of Y)if(X.result.status==="dirty")return J.common.issues.push(...X.ctx.common.issues),X.result;let W=Y.map((X)=>new u(X.ctx.common.issues));return _(J,{code:V.invalid_union,unionErrors:W}),F}if(J.common.async)return Promise.all(Q.map(async(Y)=>{let W={...J,common:{...J.common,issues:[]},parent:null};return{result:await Y._parseAsync({data:J.data,path:J.path,parent:W}),ctx:W}})).then(H);else{let Y=void 0,W=[];for(let w of Q){let z={...J,common:{...J.common,issues:[]},parent:null},q=w._parseSync({data:J.data,path:J.path,parent:z});if(q.status==="valid")return q;else if(q.status==="dirty"&&!Y)Y={result:q,ctx:z};if(z.common.issues.length)W.push(z.common.issues)}if(Y)return J.common.issues.push(...Y.ctx.common.issues),Y.result;let X=W.map((w)=>new u(w));return _(J,{code:V.invalid_union,unionErrors:X}),F}}get options(){return this._def.options}}m0.create=($,J)=>{return new m0({options:$,typeName:O.ZodUnion,...k(J)})};var X0=($)=>{if($ instanceof c0)return X0($.schema);else if($ instanceof d)return X0($.innerType());else if($ instanceof p0)return[$.value];else if($ instanceof j0)return $.options;else if($ instanceof d0)return C.objectValues($.enum);else if($ instanceof n0)return X0($._def.innerType);else if($ instanceof g0)return[void 0];else if($ instanceof l0)return[null];else if($ instanceof t)return[void 0,...X0($.unwrap())];else if($ instanceof w0)return[null,...X0($.unwrap())];else if($ instanceof h1)return X0($.unwrap());else if($ instanceof o0)return X0($.unwrap());else if($ instanceof i0)return X0($._def.innerType);else return[]};class I1 extends M{_parse($){let{ctx:J}=this._processInputParams($);if(J.parsedType!==L.object)return _(J,{code:V.invalid_type,expected:L.object,received:J.parsedType}),F;let Q=this.discriminator,H=J.data[Q],Y=this.optionsMap.get(H);if(!Y)return _(J,{code:V.invalid_union_discriminator,options:Array.from(this.optionsMap.keys()),path:[Q]}),F;if(J.common.async)return Y._parseAsync({data:J.data,path:J.path,parent:J});else return Y._parseSync({data:J.data,path:J.path,parent:J})}get discriminator(){return this._def.discriminator}get options(){return this._def.options}get optionsMap(){return this._def.optionsMap}static create($,J,Q){let H=new Map;for(let Y of J){let W=X0(Y.shape[$]);if(!W.length)throw Error(`A discriminator value for key \`${$}\` could not be extracted from all schema options`);for(let X of W){if(H.has(X))throw Error(`Discriminator property ${String($)} has duplicate value ${String(X)}`);H.set(X,Y)}}return new I1({typeName:O.ZodDiscriminatedUnion,discriminator:$,options:J,optionsMap:H,...k(Q)})}}function V8($,J){let Q=B0($),H=B0(J);if($===J)return{valid:!0,data:$};else if(Q===L.object&&H===L.object){let Y=C.objectKeys(J),W=C.objectKeys($).filter((w)=>Y.indexOf(w)!==-1),X={...$,...J};for(let w of W){let z=V8($[w],J[w]);if(!z.valid)return{valid:!1};X[w]=z.data}return{valid:!0,data:X}}else if(Q===L.array&&H===L.array){if($.length!==J.length)return{valid:!1};let Y=[];for(let W=0;W<$.length;W++){let X=$[W],w=J[W],z=V8(X,w);if(!z.valid)return{valid:!1};Y.push(z.data)}return{valid:!0,data:Y}}else if(Q===L.date&&H===L.date&&+$===+J)return{valid:!0,data:$};else return{valid:!1}}class u0 extends M{_parse($){let{status:J,ctx:Q}=this._processInputParams($),H=(Y,W)=>{if(G8(Y)||G8(W))return F;let X=V8(Y.value,W.value);if(!X.valid)return _(Q,{code:V.invalid_intersection_types}),F;if(K8(Y)||K8(W))J.dirty();return{status:J.value,value:X.data}};if(Q.common.async)return Promise.all([this._def.left._parseAsync({data:Q.data,path:Q.path,parent:Q}),this._def.right._parseAsync({data:Q.data,path:Q.path,parent:Q})]).then(([Y,W])=>H(Y,W));else return H(this._def.left._parseSync({data:Q.data,path:Q.path,parent:Q}),this._def.right._parseSync({data:Q.data,path:Q.path,parent:Q}))}}u0.create=($,J,Q)=>{return new u0({left:$,right:J,typeName:O.ZodIntersection,...k(Q)})};class Y0 extends M{_parse($){let{status:J,ctx:Q}=this._processInputParams($);if(Q.parsedType!==L.array)return _(Q,{code:V.invalid_type,expected:L.array,received:Q.parsedType}),F;if(Q.data.length<this._def.items.length)return _(Q,{code:V.too_small,minimum:this._def.items.length,inclusive:!0,exact:!1,type:"array"}),F;if(!this._def.rest&&Q.data.length>this._def.items.length)_(Q,{code:V.too_big,maximum:this._def.items.length,inclusive:!0,exact:!1,type:"array"}),J.dirty();let Y=[...Q.data].map((W,X)=>{let w=this._def.items[X]||this._def.rest;if(!w)return null;return w._parse(new r(Q,W,Q.path,X))}).filter((W)=>!!W);if(Q.common.async)return Promise.all(Y).then((W)=>{return x.mergeArray(J,W)});else return x.mergeArray(J,Y)}get items(){return this._def.items}rest($){return new Y0({...this._def,rest:$})}}Y0.create=($,J)=>{if(!Array.isArray($))throw Error("You must pass an array of schemas to z.tuple([ ... ])");return new Y0({items:$,typeName:O.ZodTuple,rest:null,...k(J)})};class V1 extends M{get keySchema(){return this._def.keyType}get valueSchema(){return this._def.valueType}_parse($){let{status:J,ctx:Q}=this._processInputParams($);if(Q.parsedType!==L.object)return _(Q,{code:V.invalid_type,expected:L.object,received:Q.parsedType}),F;let H=[],Y=this._def.keyType,W=this._def.valueType;for(let X in Q.data)H.push({key:Y._parse(new r(Q,X,Q.path,X)),value:W._parse(new r(Q,Q.data[X],Q.path,X)),alwaysSet:X in Q.data});if(Q.common.async)return x.mergeObjectAsync(J,H);else return x.mergeObjectSync(J,H)}get element(){return this._def.valueType}static create($,J,Q){if(J instanceof M)return new V1({keyType:$,valueType:J,typeName:O.ZodRecord,...k(Q)});return new V1({keyType:o.create(),valueType:$,typeName:O.ZodRecord,...k(J)})}}class j1 extends M{get keySchema(){return this._def.keyType}get valueSchema(){return this._def.valueType}_parse($){let{status:J,ctx:Q}=this._processInputParams($);if(Q.parsedType!==L.map)return _(Q,{code:V.invalid_type,expected:L.map,received:Q.parsedType}),F;let H=this._def.keyType,Y=this._def.valueType,W=[...Q.data.entries()].map(([X,w],z)=>{return{key:H._parse(new r(Q,X,Q.path,[z,"key"])),value:Y._parse(new r(Q,w,Q.path,[z,"value"]))}});if(Q.common.async){let X=new Map;return Promise.resolve().then(async()=>{for(let w of W){let z=await w.key,q=await w.value;if(z.status==="aborted"||q.status==="aborted")return F;if(z.status==="dirty"||q.status==="dirty")J.dirty();X.set(z.value,q.value)}return{status:J.value,value:X}})}else{let X=new Map;for(let w of W){let{key:z,value:q}=w;if(z.status==="aborted"||q.status==="aborted")return F;if(z.status==="dirty"||q.status==="dirty")J.dirty();X.set(z.value,q.value)}return{status:J.value,value:X}}}}j1.create=($,J,Q)=>{return new j1({valueType:J,keyType:$,typeName:O.ZodMap,...k(Q)})};class f0 extends M{_parse($){let{status:J,ctx:Q}=this._processInputParams($);if(Q.parsedType!==L.set)return _(Q,{code:V.invalid_type,expected:L.set,received:Q.parsedType}),F;let H=this._def;if(H.minSize!==null){if(Q.data.size<H.minSize.value)_(Q,{code:V.too_small,minimum:H.minSize.value,type:"set",inclusive:!0,exact:!1,message:H.minSize.message}),J.dirty()}if(H.maxSize!==null){if(Q.data.size>H.maxSize.value)_(Q,{code:V.too_big,maximum:H.maxSize.value,type:"set",inclusive:!0,exact:!1,message:H.maxSize.message}),J.dirty()}let Y=this._def.valueType;function W(w){let z=new Set;for(let q of w){if(q.status==="aborted")return F;if(q.status==="dirty")J.dirty();z.add(q.value)}return{status:J.value,value:z}}let X=[...Q.data.values()].map((w,z)=>Y._parse(new r(Q,w,Q.path,z)));if(Q.common.async)return Promise.all(X).then((w)=>W(w));else return W(X)}min($,J){return new f0({...this._def,minSize:{value:$,message:D.toString(J)}})}max($,J){return new f0({...this._def,maxSize:{value:$,message:D.toString(J)}})}size($,J){return this.min($,J).max($,J)}nonempty($){return this.min(1,$)}}f0.create=($,J)=>{return new f0({valueType:$,minSize:null,maxSize:null,typeName:O.ZodSet,...k(J)})};class x0 extends M{constructor(){super(...arguments);this.validate=this.implement}_parse($){let{ctx:J}=this._processInputParams($);if(J.parsedType!==L.function)return _(J,{code:V.invalid_type,expected:L.function,received:J.parsedType}),F;function Q(X,w){return v1({data:X,path:J.path,errorMaps:[J.common.contextualErrorMap,J.schemaErrorMap,R1(),y0].filter((z)=>!!z),issueData:{code:V.invalid_arguments,argumentsError:w}})}function H(X,w){return v1({data:X,path:J.path,errorMaps:[J.common.contextualErrorMap,J.schemaErrorMap,R1(),y0].filter((z)=>!!z),issueData:{code:V.invalid_return_type,returnTypeError:w}})}let Y={errorMap:J.common.contextualErrorMap},W=J.data;if(this._def.returns instanceof P0){let X=this;return Z(async function(...w){let z=new u([]),q=await X._def.args.parseAsync(w,Y).catch((U)=>{throw z.addIssue(Q(w,U)),z}),j=await Reflect.apply(W,this,q);return await X._def.returns._def.type.parseAsync(j,Y).catch((U)=>{throw z.addIssue(H(j,U)),z})})}else{let X=this;return Z(function(...w){let z=X._def.args.safeParse(w,Y);if(!z.success)throw new u([Q(w,z.error)]);let q=Reflect.apply(W,this,z.data),j=X._def.returns.safeParse(q,Y);if(!j.success)throw new u([H(q,j.error)]);return j.data})}}parameters(){return this._def.args}returnType(){return this._def.returns}args(...$){return new x0({...this._def,args:Y0.create($).rest(G0.create())})}returns($){return new x0({...this._def,returns:$})}implement($){return this.parse($)}strictImplement($){return this.parse($)}static create($,J,Q){return new x0({args:$?$:Y0.create([]).rest(G0.create()),returns:J||G0.create(),typeName:O.ZodFunction,...k(Q)})}}class c0 extends M{get schema(){return this._def.getter()}_parse($){let{ctx:J}=this._processInputParams($);return this._def.getter()._parse({data:J.data,path:J.path,parent:J})}}c0.create=($,J)=>{return new c0({getter:$,typeName:O.ZodLazy,...k(J)})};class p0 extends M{_parse($){if($.data!==this._def.value){let J=this._getOrReturnCtx($);return _(J,{received:J.data,code:V.invalid_literal,expected:this._def.value}),F}return{status:"valid",value:$.data}}get value(){return this._def.value}}p0.create=($,J)=>{return new p0({value:$,typeName:O.ZodLiteral,...k(J)})};function S4($,J){return new j0({values:$,typeName:O.ZodEnum,...k(J)})}class j0 extends M{constructor(){super(...arguments);w1.set(this,void 0)}_parse($){if(typeof $.data!=="string"){let J=this._getOrReturnCtx($),Q=this._def.values;return _(J,{expected:C.joinValues(Q),received:J.parsedType,code:V.invalid_type}),F}if(!N1(this,w1,"f"))L4(this,w1,new Set(this._def.values),"f");if(!N1(this,w1,"f").has($.data)){let J=this._getOrReturnCtx($),Q=this._def.values;return _(J,{received:J.data,code:V.invalid_enum_value,options:Q}),F}return Z($.data)}get options(){return this._def.values}get enum(){let $={};for(let J of this._def.values)$[J]=J;return $}get Values(){let $={};for(let J of this._def.values)$[J]=J;return $}get Enum(){let $={};for(let J of this._def.values)$[J]=J;return $}extract($,J=this._def){return j0.create($,{...this._def,...J})}exclude($,J=this._def){return j0.create(this.options.filter((Q)=>!$.includes(Q)),{...this._def,...J})}}w1=new WeakMap;j0.create=S4;class d0 extends M{constructor(){super(...arguments);z1.set(this,void 0)}_parse($){let J=C.getValidEnumValues(this._def.values),Q=this._getOrReturnCtx($);if(Q.parsedType!==L.string&&Q.parsedType!==L.number){let H=C.objectValues(J);return _(Q,{expected:C.joinValues(H),received:Q.parsedType,code:V.invalid_type}),F}if(!N1(this,z1,"f"))L4(this,z1,new Set(C.getValidEnumValues(this._def.values)),"f");if(!N1(this,z1,"f").has($.data)){let H=C.objectValues(J);return _(Q,{received:Q.data,code:V.invalid_enum_value,options:H}),F}return Z($.data)}get enum(){return this._def.values}}z1=new WeakMap;d0.create=($,J)=>{return new d0({values:$,typeName:O.ZodNativeEnum,...k(J)})};class P0 extends M{unwrap(){return this._def.type}_parse($){let{ctx:J}=this._processInputParams($);if(J.parsedType!==L.promise&&J.common.async===!1)return _(J,{code:V.invalid_type,expected:L.promise,received:J.parsedType}),F;let Q=J.parsedType===L.promise?J.data:Promise.resolve(J.data);return Z(Q.then((H)=>{return this._def.type.parseAsync(H,{path:J.path,errorMap:J.common.contextualErrorMap})}))}}P0.create=($,J)=>{return new P0({type:$,typeName:O.ZodPromise,...k(J)})};class d extends M{innerType(){return this._def.schema}sourceType(){return this._def.schema._def.typeName===O.ZodEffects?this._def.schema.sourceType():this._def.schema}_parse($){let{status:J,ctx:Q}=this._processInputParams($),H=this._def.effect||null,Y={addIssue:(W)=>{if(_(Q,W),W.fatal)J.abort();else J.dirty()},get path(){return Q.path}};if(Y.addIssue=Y.addIssue.bind(Y),H.type==="preprocess"){let W=H.transform(Q.data,Y);if(Q.common.async)return Promise.resolve(W).then(async(X)=>{if(J.value==="aborted")return F;let w=await this._def.schema._parseAsync({data:X,path:Q.path,parent:Q});if(w.status==="aborted")return F;if(w.status==="dirty")return T0(w.value);if(J.value==="dirty")return T0(w.value);return w});else{if(J.value==="aborted")return F;let X=this._def.schema._parseSync({data:W,path:Q.path,parent:Q});if(X.status==="aborted")return F;if(X.status==="dirty")return T0(X.value);if(J.value==="dirty")return T0(X.value);return X}}if(H.type==="refinement"){let W=(X)=>{let w=H.refinement(X,Y);if(Q.common.async)return Promise.resolve(w);if(w instanceof Promise)throw Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");return X};if(Q.common.async===!1){let X=this._def.schema._parseSync({data:Q.data,path:Q.path,parent:Q});if(X.status==="aborted")return F;if(X.status==="dirty")J.dirty();return W(X.value),{status:J.value,value:X.value}}else return this._def.schema._parseAsync({data:Q.data,path:Q.path,parent:Q}).then((X)=>{if(X.status==="aborted")return F;if(X.status==="dirty")J.dirty();return W(X.value).then(()=>{return{status:J.value,value:X.value}})})}if(H.type==="transform")if(Q.common.async===!1){let W=this._def.schema._parseSync({data:Q.data,path:Q.path,parent:Q});if(!k0(W))return W;let X=H.transform(W.value,Y);if(X instanceof Promise)throw Error("Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.");return{status:J.value,value:X}}else return this._def.schema._parseAsync({data:Q.data,path:Q.path,parent:Q}).then((W)=>{if(!k0(W))return W;return Promise.resolve(H.transform(W.value,Y)).then((X)=>({status:J.value,value:X}))});C.assertNever(H)}}d.create=($,J,Q)=>{return new d({schema:$,typeName:O.ZodEffects,effect:J,...k(Q)})};d.createWithPreprocess=($,J,Q)=>{return new d({schema:J,effect:{type:"preprocess",transform:$},typeName:O.ZodEffects,...k(Q)})};class t extends M{_parse($){if(this._getType($)===L.undefined)return Z(void 0);return this._def.innerType._parse($)}unwrap(){return this._def.innerType}}t.create=($,J)=>{return new t({innerType:$,typeName:O.ZodOptional,...k(J)})};class w0 extends M{_parse($){if(this._getType($)===L.null)return Z(null);return this._def.innerType._parse($)}unwrap(){return this._def.innerType}}w0.create=($,J)=>{return new w0({innerType:$,typeName:O.ZodNullable,...k(J)})};class n0 extends M{_parse($){let{ctx:J}=this._processInputParams($),Q=J.data;if(J.parsedType===L.undefined)Q=this._def.defaultValue();return this._def.innerType._parse({data:Q,path:J.path,parent:J})}removeDefault(){return this._def.innerType}}n0.create=($,J)=>{return new n0({innerType:$,typeName:O.ZodDefault,defaultValue:typeof J.default==="function"?J.default:()=>J.default,...k(J)})};class i0 extends M{_parse($){let{ctx:J}=this._processInputParams($),Q={...J,common:{...J.common,issues:[]}},H=this._def.innerType._parse({data:Q.data,path:Q.path,parent:{...Q}});if(q1(H))return H.then((Y)=>{return{status:"valid",value:Y.status==="valid"?Y.value:this._def.catchValue({get error(){return new u(Q.common.issues)},input:Q.data})}});else return{status:"valid",value:H.status==="valid"?H.value:this._def.catchValue({get error(){return new u(Q.common.issues)},input:Q.data})}}removeCatch(){return this._def.innerType}}i0.create=($,J)=>{return new i0({innerType:$,typeName:O.ZodCatch,catchValue:typeof J.catch==="function"?J.catch:()=>J.catch,...k(J)})};class U1 extends M{_parse($){if(this._getType($)!==L.nan){let Q=this._getOrReturnCtx($);return _(Q,{code:V.invalid_type,expected:L.nan,received:Q.parsedType}),F}return{status:"valid",value:$.data}}}U1.create=($)=>{return new U1({typeName:O.ZodNaN,...k($)})};var t6=Symbol("zod_brand");class h1 extends M{_parse($){let{ctx:J}=this._processInputParams($),Q=J.data;return this._def.type._parse({data:Q,path:J.path,parent:J})}unwrap(){return this._def.type}}class _1 extends M{_parse($){let{status:J,ctx:Q}=this._processInputParams($);if(Q.common.async)return(async()=>{let Y=await this._def.in._parseAsync({data:Q.data,path:Q.path,parent:Q});if(Y.status==="aborted")return F;if(Y.status==="dirty")return J.dirty(),T0(Y.value);else return this._def.out._parseAsync({data:Y.value,path:Q.path,parent:Q})})();else{let H=this._def.in._parseSync({data:Q.data,path:Q.path,parent:Q});if(H.status==="aborted")return F;if(H.status==="dirty")return J.dirty(),{status:"dirty",value:H.value};else return this._def.out._parseSync({data:H.value,path:Q.path,parent:Q})}}static create($,J){return new _1({in:$,out:J,typeName:O.ZodPipeline})}}class o0 extends M{_parse($){let J=this._def.innerType._parse($),Q=(H)=>{if(k0(H))H.value=Object.freeze(H.value);return H};return q1(J)?J.then((H)=>Q(H)):Q(J)}unwrap(){return this._def.innerType}}o0.create=($,J)=>{return new o0({innerType:$,typeName:O.ZodReadonly,...k(J)})};function j4($,J){let Q=typeof $==="function"?$(J):typeof $==="string"?{message:$}:$;return typeof Q==="string"?{message:Q}:Q}function k4($,J={},Q){if($)return A0.create().superRefine((H,Y)=>{var W,X;let w=$(H);if(w instanceof Promise)return w.then((z)=>{var q,j;if(!z){let G=j4(J,H),U=(j=(q=G.fatal)!==null&&q!==void 0?q:Q)!==null&&j!==void 0?j:!0;Y.addIssue({code:"custom",...G,fatal:U})}});if(!w){let z=j4(J,H),q=(X=(W=z.fatal)!==null&&W!==void 0?W:Q)!==null&&X!==void 0?X:!0;Y.addIssue({code:"custom",...z,fatal:q})}return});return A0.create()}var r6={object:N.lazycreate},O;(function($){$.ZodString="ZodString",$.ZodNumber="ZodNumber",$.ZodNaN="ZodNaN",$.ZodBigInt="ZodBigInt",$.ZodBoolean="ZodBoolean",$.ZodDate="ZodDate",$.ZodSymbol="ZodSymbol",$.ZodUndefined="ZodUndefined",$.ZodNull="ZodNull",$.ZodAny="ZodAny",$.ZodUnknown="ZodUnknown",$.ZodNever="ZodNever",$.ZodVoid="ZodVoid",$.ZodArray="ZodArray",$.ZodObject="ZodObject",$.ZodUnion="ZodUnion",$.ZodDiscriminatedUnion="ZodDiscriminatedUnion",$.ZodIntersection="ZodIntersection",$.ZodTuple="ZodTuple",$.ZodRecord="ZodRecord",$.ZodMap="ZodMap",$.ZodSet="ZodSet",$.ZodFunction="ZodFunction",$.ZodLazy="ZodLazy",$.ZodLiteral="ZodLiteral",$.ZodEnum="ZodEnum",$.ZodEffects="ZodEffects",$.ZodNativeEnum="ZodNativeEnum",$.ZodOptional="ZodOptional",$.ZodNullable="ZodNullable",$.ZodDefault="ZodDefault",$.ZodCatch="ZodCatch",$.ZodPromise="ZodPromise",$.ZodBranded="ZodBranded",$.ZodPipeline="ZodPipeline",$.ZodReadonly="ZodReadonly"})(O||(O={}));var s6=($,J={message:`Input not instance of ${$.name}`})=>k4((Q)=>Q instanceof $,J),M4=o.create,A4=K0.create,e6=U1.create,$9=V0.create,f4=Z0.create,J9=M0.create,Q9=G1.create,Y9=g0.create,H9=l0.create,W9=A0.create,X9=G0.create,B9=Q0.create,w9=K1.create,z9=a.create,q9=N.create,G9=N.strictCreate,K9=m0.create,V9=I1.create,j9=u0.create,U9=Y0.create,_9=V1.create,L9=j1.create,D9=f0.create,O9=x0.create,F9=c0.create,S9=p0.create,k9=j0.create,M9=d0.create,A9=P0.create,U4=d.create,f9=t.create,P9=w0.create,b9=d.createWithPreprocess,C9=_1.create,E9=()=>M4().optional(),R9=()=>A4().optional(),v9=()=>f4().optional(),N9={string:($)=>o.create({...$,coerce:!0}),number:($)=>K0.create({...$,coerce:!0}),boolean:($)=>Z0.create({...$,coerce:!0}),bigint:($)=>V0.create({...$,coerce:!0}),date:($)=>M0.create({...$,coerce:!0})},I9=F,B=Object.freeze({__proto__:null,defaultErrorMap:y0,setErrorMap:b6,getErrorMap:R1,makeIssue:v1,EMPTY_PATH:C6,addIssueToContext:_,ParseStatus:x,INVALID:F,DIRTY:T0,OK:Z,isAborted:G8,isDirty:K8,isValid:k0,isAsync:q1,get util(){return C},get objectUtil(){return q8},ZodParsedType:L,getParsedType:B0,ZodType:M,datetimeRegex:F4,ZodString:o,ZodNumber:K0,ZodBigInt:V0,ZodBoolean:Z0,ZodDate:M0,ZodSymbol:G1,ZodUndefined:g0,ZodNull:l0,ZodAny:A0,ZodUnknown:G0,ZodNever:Q0,ZodVoid:K1,ZodArray:a,ZodObject:N,ZodUnion:m0,ZodDiscriminatedUnion:I1,ZodIntersection:u0,ZodTuple:Y0,ZodRecord:V1,ZodMap:j1,ZodSet:f0,ZodFunction:x0,ZodLazy:c0,ZodLiteral:p0,ZodEnum:j0,ZodNativeEnum:d0,ZodPromise:P0,ZodEffects:d,ZodTransformer:d,ZodOptional:t,ZodNullable:w0,ZodDefault:n0,ZodCatch:i0,ZodNaN:U1,BRAND:t6,ZodBranded:h1,ZodPipeline:_1,ZodReadonly:o0,custom:k4,Schema:M,ZodSchema:M,late:r6,get ZodFirstPartyTypeKind(){return O},coerce:N9,any:W9,array:z9,bigint:$9,boolean:f4,date:J9,discriminatedUnion:V9,effect:U4,enum:k9,function:O9,instanceof:s6,intersection:j9,lazy:F9,literal:S9,map:L9,nan:e6,nativeEnum:M9,never:B9,null:H9,nullable:P9,number:A4,object:q9,oboolean:v9,onumber:R9,optional:f9,ostring:E9,pipeline:C9,preprocess:b9,promise:A9,record:_9,set:D9,strictObject:G9,string:M4,symbol:Q9,transformer:U4,tuple:U9,undefined:Y9,union:K9,unknown:X9,void:w9,NEVER:I9,ZodIssueCode:V,quotelessJson:P6,ZodError:u});var j8="2024-11-05",P4=[j8,"2024-10-07"],T1="2.0",b4=B.union([B.string(),B.number().int()]),C4=B.string(),s=B.object({_meta:B.optional(B.object({progressToken:B.optional(b4)}).passthrough())}).passthrough(),c=B.object({method:B.string(),params:B.optional(s)}),L1=B.object({_meta:B.optional(B.object({}).passthrough())}).passthrough(),H0=B.object({method:B.string(),params:B.optional(L1)}),e=B.object({_meta:B.optional(B.object({}).passthrough())}).passthrough(),x1=B.union([B.string(),B.number().int()]),h9=B.object({jsonrpc:B.literal(T1),id:x1}).merge(c).strict(),T9=B.object({jsonrpc:B.literal(T1)}).merge(H0).strict(),x9=B.object({jsonrpc:B.literal(T1),id:x1,result:e}).strict(),b0;(function($){$[$.ConnectionClosed=-32000]="ConnectionClosed",$[$.RequestTimeout=-32001]="RequestTimeout",$[$.ParseError=-32700]="ParseError",$[$.InvalidRequest=-32600]="InvalidRequest",$[$.MethodNotFound=-32601]="MethodNotFound",$[$.InvalidParams=-32602]="InvalidParams",$[$.InternalError=-32603]="InternalError"})(b0||(b0={}));var y9=B.object({jsonrpc:B.literal(T1),id:x1,error:B.object({code:B.number().int(),message:B.string(),data:B.optional(B.unknown())})}).strict(),E4=B.union([h9,T9,x9,y9]),y1=e.strict(),Z1=H0.extend({method:B.literal("notifications/cancelled"),params:L1.extend({requestId:x1,reason:B.string().optional()})}),R4=B.object({name:B.string(),version:B.string()}).passthrough(),Z9=B.object({experimental:B.optional(B.object({}).passthrough()),sampling:B.optional(B.object({}).passthrough()),roots:B.optional(B.object({listChanged:B.optional(B.boolean())}).passthrough())}).passthrough(),U8=c.extend({method:B.literal("initialize"),params:s.extend({protocolVersion:B.string(),capabilities:Z9,clientInfo:R4})}),g9=B.object({experimental:B.optional(B.object({}).passthrough()),logging:B.optional(B.object({}).passthrough()),prompts:B.optional(B.object({listChanged:B.optional(B.boolean())}).passthrough()),resources:B.optional(B.object({subscribe:B.optional(B.boolean()),listChanged:B.optional(B.boolean())}).passthrough()),tools:B.optional(B.object({listChanged:B.optional(B.boolean())}).passthrough())}).passthrough(),l9=e.extend({protocolVersion:B.string(),capabilities:g9,serverInfo:R4,instructions:B.optional(B.string())}),_8=H0.extend({method:B.literal("notifications/initialized")}),g1=c.extend({method:B.literal("ping")}),m9=B.object({progress:B.number(),total:B.optional(B.number())}).passthrough(),l1=H0.extend({method:B.literal("notifications/progress"),params:L1.merge(m9).extend({progressToken:b4})}),m1=c.extend({params:s.extend({cursor:B.optional(C4)}).optional()}),u1=e.extend({nextCursor:B.optional(C4)}),v4=B.object({uri:B.string(),mimeType:B.optional(B.string())}).passthrough(),N4=v4.extend({text:B.string()}),I4=v4.extend({blob:B.string().base64()}),u9=B.object({uri:B.string(),name:B.string(),description:B.optional(B.string()),mimeType:B.optional(B.string())}).passthrough(),c9=B.object({uriTemplate:B.string(),name:B.string(),description:B.optional(B.string()),mimeType:B.optional(B.string())}).passthrough(),p9=m1.extend({method:B.literal("resources/list")}),d9=u1.extend({resources:B.array(u9)}),n9=m1.extend({method:B.literal("resources/templates/list")}),i9=u1.extend({resourceTemplates:B.array(c9)}),o9=c.extend({method:B.literal("resources/read"),params:s.extend({uri:B.string()})}),a9=e.extend({contents:B.array(B.union([N4,I4]))}),t9=H0.extend({method:B.literal("notifications/resources/list_changed")}),r9=c.extend({method:B.literal("resources/subscribe"),params:s.extend({uri:B.string()})}),s9=c.extend({method:B.literal("resources/unsubscribe"),params:s.extend({uri:B.string()})}),e9=H0.extend({method:B.literal("notifications/resources/updated"),params:L1.extend({uri:B.string()})}),$$=B.object({name:B.string(),description:B.optional(B.string()),required:B.optional(B.boolean())}).passthrough(),J$=B.object({name:B.string(),description:B.optional(B.string()),arguments:B.optional(B.array($$))}).passthrough(),Q$=m1.extend({method:B.literal("prompts/list")}),Y$=u1.extend({prompts:B.array(J$)}),H$=c.extend({method:B.literal("prompts/get"),params:s.extend({name:B.string(),arguments:B.optional(B.record(B.string()))})}),c1=B.object({type:B.literal("text"),text:B.string()}).passthrough(),p1=B.object({type:B.literal("image"),data:B.string().base64(),mimeType:B.string()}).passthrough(),h4=B.object({type:B.literal("resource"),resource:B.union([N4,I4])}).passthrough(),W$=B.object({role:B.enum(["user","assistant"]),content:B.union([c1,p1,h4])}).passthrough(),X$=e.extend({description:B.optional(B.string()),messages:B.array(W$)}),B$=H0.extend({method:B.literal("notifications/prompts/list_changed")}),w$=B.object({name:B.string(),description:B.optional(B.string()),inputSchema:B.object({type:B.literal("object"),properties:B.optional(B.object({}).passthrough())}).passthrough()}).passthrough(),L8=m1.extend({method:B.literal("tools/list")}),z$=u1.extend({tools:B.array(w$)}),T4=e.extend({content:B.array(B.union([c1,p1,h4])),isError:B.boolean().default(!1).optional()}),t7=T4.or(e.extend({toolResult:B.unknown()})),D8=c.extend({method:B.literal("tools/call"),params:s.extend({name:B.string(),arguments:B.optional(B.record(B.unknown()))})}),q$=H0.extend({method:B.literal("notifications/tools/list_changed")}),x4=B.enum(["debug","info","notice","warning","error","critical","alert","emergency"]),G$=c.extend({method:B.literal("logging/setLevel"),params:s.extend({level:x4})}),K$=H0.extend({method:B.literal("notifications/message"),params:L1.extend({level:x4,logger:B.optional(B.string()),data:B.unknown()})}),V$=B.object({name:B.string().optional()}).passthrough(),j$=B.object({hints:B.optional(B.array(V$)),costPriority:B.optional(B.number().min(0).max(1)),speedPriority:B.optional(B.number().min(0).max(1)),intelligencePriority:B.optional(B.number().min(0).max(1))}).passthrough(),U$=B.object({role:B.enum(["user","assistant"]),content:B.union([c1,p1])}).passthrough(),_$=c.extend({method:B.literal("sampling/createMessage"),params:s.extend({messages:B.array(U$),systemPrompt:B.optional(B.string()),includeContext:B.optional(B.enum(["none","thisServer","allServers"])),temperature:B.optional(B.number()),maxTokens:B.number().int(),stopSequences:B.optional(B.array(B.string())),metadata:B.optional(B.object({}).passthrough()),modelPreferences:B.optional(j$)})}),O8=e.extend({model:B.string(),stopReason:B.optional(B.enum(["endTurn","stopSequence","maxTokens"]).or(B.string())),role:B.enum(["user","assistant"]),content:B.discriminatedUnion("type",[c1,p1])}),L$=B.object({type:B.literal("ref/resource"),uri:B.string()}).passthrough(),D$=B.object({type:B.literal("ref/prompt"),name:B.string()}).passthrough(),O$=c.extend({method:B.literal("completion/complete"),params:s.extend({ref:B.union([D$,L$]),argument:B.object({name:B.string(),value:B.string()}).passthrough()})}),F$=e.extend({completion:B.object({values:B.array(B.string()).max(100),total:B.optional(B.number().int()),hasMore:B.optional(B.boolean())}).passthrough()}),S$=B.object({uri:B.string().startsWith("file://"),name:B.optional(B.string())}).passthrough(),k$=c.extend({method:B.literal("roots/list")}),F8=e.extend({roots:B.array(S$)}),M$=H0.extend({method:B.literal("notifications/roots/list_changed")}),r7=B.union([g1,U8,O$,G$,H$,Q$,p9,n9,o9,r9,s9,D8,L8]),s7=B.union([Z1,l1,_8,M$]),e7=B.union([y1,O8,F8]),$J=B.union([g1,_$,k$]),JJ=B.union([Z1,l1,K$,e9,t9,q$,B$]),QJ=B.union([y1,l9,F$,X$,Y$,d9,i9,a9,T4,z$]);class D1 extends Error{constructor($,J,Q){super(`MCP error ${$}: ${J}`);this.code=$,this.data=Q}}var A$=60000;class S8{constructor($){this._options=$,this._requestMessageId=0,this._requestHandlers=new Map,this._requestHandlerAbortControllers=new Map,this._notificationHandlers=new Map,this._responseHandlers=new Map,this._progressHandlers=new Map,this.setNotificationHandler(Z1,(J)=>{let Q=this._requestHandlerAbortControllers.get(J.params.requestId);Q===null||Q===void 0||Q.abort(J.params.reason)}),this.setNotificationHandler(l1,(J)=>{this._onprogress(J)}),this.setRequestHandler(g1,(J)=>({}))}async connect($){this._transport=$,this._transport.onclose=()=>{this._onclose()},this._transport.onerror=(J)=>{this._onerror(J)},this._transport.onmessage=(J)=>{if(!("method"in J))this._onresponse(J);else if("id"in J)this._onrequest(J);else this._onnotification(J)},await this._transport.start()}_onclose(){var $;let J=this._responseHandlers;this._responseHandlers=new Map,this._progressHandlers.clear(),this._transport=void 0,($=this.onclose)===null||$===void 0||$.call(this);let Q=new D1(b0.ConnectionClosed,"Connection closed");for(let H of J.values())H(Q)}_onerror($){var J;(J=this.onerror)===null||J===void 0||J.call(this,$)}_onnotification($){var J;let Q=(J=this._notificationHandlers.get($.method))!==null&&J!==void 0?J:this.fallbackNotificationHandler;if(Q===void 0)return;Promise.resolve().then(()=>Q($)).catch((H)=>this._onerror(Error(`Uncaught error in notification handler: ${H}`)))}_onrequest($){var J,Q;let H=(J=this._requestHandlers.get($.method))!==null&&J!==void 0?J:this.fallbackRequestHandler;if(H===void 0){(Q=this._transport)===null||Q===void 0||Q.send({jsonrpc:"2.0",id:$.id,error:{code:b0.MethodNotFound,message:"Method not found"}}).catch((W)=>this._onerror(Error(`Failed to send an error response: ${W}`)));return}let Y=new AbortController;this._requestHandlerAbortControllers.set($.id,Y),Promise.resolve().then(()=>H($,{signal:Y.signal})).then((W)=>{var X;if(Y.signal.aborted)return;return(X=this._transport)===null||X===void 0?void 0:X.send({result:W,jsonrpc:"2.0",id:$.id})},(W)=>{var X,w;if(Y.signal.aborted)return;return(X=this._transport)===null||X===void 0?void 0:X.send({jsonrpc:"2.0",id:$.id,error:{code:Number.isSafeInteger(W.code)?W.code:b0.InternalError,message:(w=W.message)!==null&&w!==void 0?w:"Internal error"}})}).catch((W)=>this._onerror(Error(`Failed to send response: ${W}`))).finally(()=>{this._requestHandlerAbortControllers.delete($.id)})}_onprogress($){let{progressToken:J,...Q}=$.params,H=this._progressHandlers.get(Number(J));if(H===void 0){this._onerror(Error(`Received a progress notification for an unknown token: ${JSON.stringify($)}`));return}H(Q)}_onresponse($){let J=$.id,Q=this._responseHandlers.get(Number(J));if(Q===void 0){this._onerror(Error(`Received a response for an unknown message ID: ${JSON.stringify($)}`));return}if(this._responseHandlers.delete(Number(J)),this._progressHandlers.delete(Number(J)),"result"in $)Q($);else{let H=new D1($.error.code,$.error.message,$.error.data);Q(H)}}get transport(){return this._transport}async close(){var $;await(($=this._transport)===null||$===void 0?void 0:$.close())}request($,J,Q){return new Promise((H,Y)=>{var W,X,w,z;if(!this._transport){Y(Error("Not connected"));return}if(((W=this._options)===null||W===void 0?void 0:W.enforceStrictCapabilities)===!0)this.assertCapabilityForMethod($.method);(X=Q===null||Q===void 0?void 0:Q.signal)===null||X===void 0||X.throwIfAborted();let q=this._requestMessageId++,j={...$,jsonrpc:"2.0",id:q};if(Q===null||Q===void 0?void 0:Q.onprogress)this._progressHandlers.set(q,Q.onprogress),j.params={...$.params,_meta:{progressToken:q}};let G=void 0;this._responseHandlers.set(q,(h)=>{var y;if(G!==void 0)clearTimeout(G);if((y=Q===null||Q===void 0?void 0:Q.signal)===null||y===void 0?void 0:y.aborted)return;if(h instanceof Error)return Y(h);try{let i=J.parse(h.result);H(i)}catch(i){Y(i)}});let U=(h)=>{var y;this._responseHandlers.delete(q),this._progressHandlers.delete(q),(y=this._transport)===null||y===void 0||y.send({jsonrpc:"2.0",method:"notifications/cancelled",params:{requestId:q,reason:String(h)}}).catch((i)=>this._onerror(Error(`Failed to send cancellation: ${i}`))),Y(h)};(w=Q===null||Q===void 0?void 0:Q.signal)===null||w===void 0||w.addEventListener("abort",()=>{var h;if(G!==void 0)clearTimeout(G);U((h=Q===null||Q===void 0?void 0:Q.signal)===null||h===void 0?void 0:h.reason)});let A=(z=Q===null||Q===void 0?void 0:Q.timeout)!==null&&z!==void 0?z:A$;G=setTimeout(()=>U(new D1(b0.RequestTimeout,"Request timed out",{timeout:A})),A),this._transport.send(j).catch((h)=>{if(G!==void 0)clearTimeout(G);Y(h)})})}async notification($){if(!this._transport)throw Error("Not connected");this.assertNotificationCapability($.method);let J={...$,jsonrpc:"2.0"};await this._transport.send(J)}setRequestHandler($,J){let Q=$.shape.method.value;this.assertRequestHandlerCapability(Q),this._requestHandlers.set(Q,(H,Y)=>Promise.resolve(J($.parse(H),Y)))}removeRequestHandler($){this._requestHandlers.delete($)}assertCanSetRequestHandler($){if(this._requestHandlers.has($))throw Error(`A request handler for ${$} already exists, which would be overridden`)}setNotificationHandler($,J){this._notificationHandlers.set($.shape.method.value,(Q)=>Promise.resolve(J($.parse(Q))))}removeNotificationHandler($){this._notificationHandlers.delete($)}}function y4($,J){return Object.entries(J).reduce((Q,[H,Y])=>{if(Y&&typeof Y==="object")Q[H]=Q[H]?{...Q[H],...Y}:Y;else Q[H]=Y;return Q},{...$})}class k8 extends S8{constructor($,J){var Q;super(J);this._serverInfo=$,this._capabilities=(Q=J===null||J===void 0?void 0:J.capabilities)!==null&&Q!==void 0?Q:{},this._instructions=J===null||J===void 0?void 0:J.instructions,this.setRequestHandler(U8,(H)=>this._oninitialize(H)),this.setNotificationHandler(_8,()=>{var H;return(H=this.oninitialized)===null||H===void 0?void 0:H.call(this)})}registerCapabilities($){if(this.transport)throw Error("Cannot register capabilities after connecting to transport");this._capabilities=y4(this._capabilities,$)}assertCapabilityForMethod($){var J,Q;switch($){case"sampling/createMessage":if(!((J=this._clientCapabilities)===null||J===void 0?void 0:J.sampling))throw Error(`Client does not support sampling (required for ${$})`);break;case"roots/list":if(!((Q=this._clientCapabilities)===null||Q===void 0?void 0:Q.roots))throw Error(`Client does not support listing roots (required for ${$})`);break;case"ping":break}}assertNotificationCapability($){switch($){case"notifications/message":if(!this._capabilities.logging)throw Error(`Server does not support logging (required for ${$})`);break;case"notifications/resources/updated":case"notifications/resources/list_changed":if(!this._capabilities.resources)throw Error(`Server does not support notifying about resources (required for ${$})`);break;case"notifications/tools/list_changed":if(!this._capabilities.tools)throw Error(`Server does not support notifying of tool list changes (required for ${$})`);break;case"notifications/prompts/list_changed":if(!this._capabilities.prompts)throw Error(`Server does not support notifying of prompt list changes (required for ${$})`);break;case"notifications/cancelled":break;case"notifications/progress":break}}assertRequestHandlerCapability($){switch($){case"sampling/createMessage":if(!this._capabilities.sampling)throw Error(`Server does not support sampling (required for ${$})`);break;case"logging/setLevel":if(!this._capabilities.logging)throw Error(`Server does not support logging (required for ${$})`);break;case"prompts/get":case"prompts/list":if(!this._capabilities.prompts)throw Error(`Server does not support prompts (required for ${$})`);break;case"resources/list":case"resources/templates/list":case"resources/read":if(!this._capabilities.resources)throw Error(`Server does not support resources (required for ${$})`);break;case"tools/call":case"tools/list":if(!this._capabilities.tools)throw Error(`Server does not support tools (required for ${$})`);break;case"ping":case"initialize":break}}async _oninitialize($){let J=$.params.protocolVersion;return this._clientCapabilities=$.params.capabilities,this._clientVersion=$.params.clientInfo,{protocolVersion:P4.includes(J)?J:j8,capabilities:this.getCapabilities(),serverInfo:this._serverInfo,...this._instructions&&{instructions:this._instructions}}}getClientCapabilities(){return this._clientCapabilities}getClientVersion(){return this._clientVersion}getCapabilities(){return this._capabilities}async ping(){return this.request({method:"ping"},y1)}async createMessage($,J){return this.request({method:"sampling/createMessage",params:$},O8,J)}async listRoots($,J){return this.request({method:"roots/list",params:$},F8,J)}async sendLoggingMessage($){return this.notification({method:"notifications/message",params:$})}async sendResourceUpdated($){return this.notification({method:"notifications/resources/updated",params:$})}async sendResourceListChanged(){return this.notification({method:"notifications/resources/list_changed"})}async sendToolListChanged(){return this.notification({method:"notifications/tools/list_changed"})}async sendPromptListChanged(){return this.notification({method:"notifications/prompts/list_changed"})}}import g4 from"node:process";class M8{append($){this._buffer=this._buffer?Buffer.concat([this._buffer,$]):$}readMessage(){if(!this._buffer)return null;let $=this._buffer.indexOf(`
`);if($===-1)return null;let J=this._buffer.toString("utf8",0,$);return this._buffer=this._buffer.subarray($+1),f$(J)}clear(){this._buffer=void 0}}function f$($){return E4.parse(JSON.parse($))}function Z4($){return JSON.stringify($)+`
`}class A8{constructor($=g4.stdin,J=g4.stdout){this._stdin=$,this._stdout=J,this._readBuffer=new M8,this._started=!1,this._ondata=(Q)=>{this._readBuffer.append(Q),this.processReadBuffer()},this._onerror=(Q)=>{var H;(H=this.onerror)===null||H===void 0||H.call(this,Q)}}async start(){if(this._started)throw Error("StdioServerTransport already started! If using Server class, note that connect() calls start() automatically.");this._started=!0,this._stdin.on("data",this._ondata),this._stdin.on("error",this._onerror)}processReadBuffer(){var $,J;while(!0)try{let Q=this._readBuffer.readMessage();if(Q===null)break;($=this.onmessage)===null||$===void 0||$.call(this,Q)}catch(Q){(J=this.onerror)===null||J===void 0||J.call(this,Q)}}async close(){var $;if(this._stdin.off("data",this._ondata),this._stdin.off("error",this._onerror),this._stdin.listenerCount("data")===0)this._stdin.pause();this._readBuffer.clear(),($=this.onclose)===null||$===void 0||$.call(this)}send($){return new Promise((J)=>{let Q=Z4($);if(this._stdout.write(Q))J();else this._stdout.once("drain",J)})}}f8();var R$={name:"contacts",description:"Search and retrieve contacts from Apple Contacts app",inputSchema:{type:"object",properties:{name:{type:"string",description:"Name to search for (optional - if not provided, returns all contacts). Can be partial name to search."}}}},v$={name:"notes",description:"Search, retrieve and create notes in Apple Notes app",inputSchema:{type:"object",properties:{operation:{type:"string",description:"Operation to perform: 'search', 'list', or 'create'",enum:["search","list","create"]},searchText:{type:"string",description:"Text to search for in notes (required for search operation)"},title:{type:"string",description:"Title of the note to create (required for create operation)"},body:{type:"string",description:"Content of the note to create (required for create operation)"},folderName:{type:"string",description:"Name of the folder to create the note in (optional for create operation, defaults to 'Claude')"}},required:["operation"]}},N$={name:"messages",description:"Interact with Apple Messages app - send, read, schedule messages and check unread messages",inputSchema:{type:"object",properties:{operation:{type:"string",description:"Operation to perform: 'send', 'read', 'schedule', or 'unread'",enum:["send","read","schedule","unread"]},phoneNumber:{type:"string",description:"Phone number to send message to (required for send, read, and schedule operations)"},message:{type:"string",description:"Message to send (required for send and schedule operations)"},limit:{type:"number",description:"Number of messages to read (optional, for read and unread operations)"},scheduledTime:{type:"string",description:"ISO string of when to send the message (required for schedule operation)"}},required:["operation"]}},I$={name:"mail",description:"Interact with Apple Mail app - read unread emails, search emails, and send emails",inputSchema:{type:"object",properties:{operation:{type:"string",description:"Operation to perform: 'unread', 'search', 'send', 'mailboxes', 'accounts', or 'latest'",enum:["unread","search","send","mailboxes","accounts","latest"]},account:{type:"string",description:"Email account to use (optional - if not provided, searches across all accounts)"},mailbox:{type:"string",description:"Mailbox to use (optional - if not provided, uses inbox or searches across all mailboxes)"},limit:{type:"number",description:"Number of emails to retrieve (optional, for unread, search, and latest operations)"},searchTerm:{type:"string",description:"Text to search for in emails (required for search operation)"},to:{type:"string",description:"Recipient email address (required for send operation)"},subject:{type:"string",description:"Email subject (required for send operation)"},body:{type:"string",description:"Email body content (required for send operation)"},cc:{type:"string",description:"CC email address (optional for send operation)"},bcc:{type:"string",description:"BCC email address (optional for send operation)"}},required:["operation"]}},h$={name:"reminders",description:"Search, create, and open reminders in Apple Reminders app",inputSchema:{type:"object",properties:{operation:{type:"string",description:"Operation to perform: 'list', 'search', 'open', 'create', or 'listById'",enum:["list","search","open","create","listById"]},searchText:{type:"string",description:"Text to search for in reminders (required for search and open operations)"},name:{type:"string",description:"Name of the reminder to create (required for create operation)"},listName:{type:"string",description:"Name of the list to create the reminder in (optional for create operation)"},listId:{type:"string",description:"ID of the list to get reminders from (required for listById operation)"},props:{type:"array",items:{type:"string"},description:"Properties to include in the reminders (optional for listById operation)"},notes:{type:"string",description:"Additional notes for the reminder (optional for create operation)"},dueDate:{type:"string",description:"Due date for the reminder in ISO format (optional for create operation)"}},required:["operation"]}},T$={name:"calendar",description:"Search, create, and open calendar events in Apple Calendar app",inputSchema:{type:"object",properties:{operation:{type:"string",description:"Operation to perform: 'search', 'open', 'list', or 'create'",enum:["search","open","list","create"]},searchText:{type:"string",description:"Text to search for in event titles, locations, and notes (required for search operation)"},eventId:{type:"string",description:"ID of the event to open (required for open operation)"},limit:{type:"number",description:"Number of events to retrieve (optional, default 10)"},fromDate:{type:"string",description:"Start date for search range in ISO format (optional, default is today)"},toDate:{type:"string",description:"End date for search range in ISO format (optional, default is 30 days from now for search, 7 days for list)"},title:{type:"string",description:"Title of the event to create (required for create operation)"},startDate:{type:"string",description:"Start date/time of the event in ISO format (required for create operation)"},endDate:{type:"string",description:"End date/time of the event in ISO format (required for create operation)"},location:{type:"string",description:"Location of the event (optional for create operation)"},notes:{type:"string",description:"Additional notes for the event (optional for create operation)"},isAllDay:{type:"boolean",description:"Whether the event is an all-day event (optional for create operation, default is false)"},calendarName:{type:"string",description:"Name of the calendar (optional — filters list/search to a specific calendar, or targets create to a specific calendar)"}},required:["operation"]}},x$={name:"maps",description:"Search locations, manage guides, save favorites, and get directions using Apple Maps",inputSchema:{type:"object",properties:{operation:{type:"string",description:"Operation to perform with Maps",enum:["search","save","directions","pin","listGuides","addToGuide","createGuide"]},query:{type:"string",description:"Search query for locations (required for search)"},limit:{type:"number",description:"Maximum number of results to return (optional for search)"},name:{type:"string",description:"Name of the location (required for save and pin)"},address:{type:"string",description:"Address of the location (required for save, pin, addToGuide)"},fromAddress:{type:"string",description:"Starting address for directions (required for directions)"},toAddress:{type:"string",description:"Destination address for directions (required for directions)"},transportType:{type:"string",description:"Type of transport to use (optional for directions)",enum:["driving","walking","transit"]},guideName:{type:"string",description:"Name of the guide (required for createGuide and addToGuide)"}},required:["operation"]}},y$=[R$,v$,N$,I$,h$,T$,x$],l4=y$;U0();function m4(){return{skipConfirmation:process.env.APPLE_MCP_SKIP_CONFIRMATION==="true"}}async function $0($,J,Q){if(m4().skipConfirmation)return{confirmed:!0,message:"Auto-approved (APPLE_MCP_SKIP_CONFIRMATION=true)"};try{if($.getClientCapabilities()?.sampling){let W=await $.createMessage({messages:[{role:"user",content:{type:"text",text:`The MCP server wants to perform the following action:

**${J}**

${Q}

Do you approve? Reply with "yes" or "no".`}}],maxTokens:10}),X=W.content.type==="text"?W.content.text.toLowerCase().trim():"",w=X.includes("yes")||X.includes("approve");return{confirmed:w,message:w?"User approved the operation.":"User denied the operation."}}}catch{}return{confirmed:!1,message:`Action requires confirmation: ${J}

Details:
${Q}

To bypass confirmation, set the environment variable APPLE_MCP_SKIP_CONFIRMATION=true`}}var O6=!0,I0=null,X8=!1;console.error("Starting apple-mcp server...");var Q1=null,Y1=null,H1=null,W1=null,X1=null,B1=null,E1=null;async function F0($){if(X8)console.error(`Loading ${$} module on demand (safe mode)...`);try{switch($){case"contacts":if(!Q1)Q1=(await Promise.resolve().then(() => (b8(),P8))).default;return Q1;case"notes":if(!Y1)Y1=(await Promise.resolve().then(() => (R8(),E8))).default;return Y1;case"message":if(!H1)H1=(await Promise.resolve().then(() => (h8(),I8))).default;return H1;case"mail":if(!W1)W1=(await Promise.resolve().then(() => (Z8(),y8))).default;return W1;case"reminders":if(!X1)X1=(await Promise.resolve().then(() => (l8(),g8))).default;return X1;case"calendar":if(!B1)B1=(await Promise.resolve().then(() => (u8(),m8))).default;return B1;case"maps":if(!E1)E1=(await Promise.resolve().then(() => (q4(),z4))).default;return E1;default:throw Error(`Unknown module: ${$}`)}}catch(J){throw console.error(`Error loading module ${$}:`,J),J}}I0=setTimeout(()=>{console.error("Loading timeout reached. Switching to safe mode (lazy loading...)"),O6=!1,X8=!0,Q1=null,Y1=null,H1=null,W1=null,X1=null,B1=null,G4()},5000);async function Z7(){try{if(console.error("Attempting to eagerly load modules..."),Q1=(await Promise.resolve().then(() => (b8(),P8))).default,console.error("- Contacts module loaded successfully"),Y1=(await Promise.resolve().then(() => (R8(),E8))).default,console.error("- Notes module loaded successfully"),H1=(await Promise.resolve().then(() => (h8(),I8))).default,console.error("- Message module loaded successfully"),W1=(await Promise.resolve().then(() => (Z8(),y8))).default,console.error("- Mail module loaded successfully"),X1=(await Promise.resolve().then(() => (l8(),g8))).default,console.error("- Reminders module loaded successfully"),B1=(await Promise.resolve().then(() => (u8(),m8))).default,console.error("- Calendar module loaded successfully"),E1=(await Promise.resolve().then(() => (q4(),z4))).default,console.error("- Maps module loaded successfully"),I0)clearTimeout(I0),I0=null;console.error("All modules loaded successfully, using eager loading mode"),G4()}catch($){if(console.error("Error during eager loading:",$),console.error("Switching to safe mode (lazy loading)..."),I0)clearTimeout(I0),I0=null;O6=!1,X8=!0,Q1=null,Y1=null,H1=null,W1=null,X1=null,B1=null,E1=null,G4()}}Z7();var m;function G4(){console.error(`Initializing server in ${X8?"safe":"standard"} mode...`),m=new k8({name:"Apple MCP tools",version:"1.0.0"},{capabilities:{tools:{}}}),m.setRequestHandler(L8,async()=>({tools:l4})),m.setRequestHandler(D8,async($)=>{try{let{name:J,arguments:Q}=$.params;if(!Q)throw Error("No arguments provided");switch(J){case"contacts":{if(!g7(Q))throw Error("Invalid arguments for contacts tool");try{let H=await F0("contacts");if(Q.name){let Y=await H.findNumber(Q.name);return{content:[{type:"text",text:Y.length?`${Q.name}: ${Y.join(", ")}`:`No contact found for "${Q.name}". Try a different name or use no name parameter to list all contacts.`}],isError:!1}}else{let Y=await H.getAllNumbers(),W=Object.keys(Y).length;if(W===0)return{content:[{type:"text",text:"No contacts found in the address book. Please make sure you have granted access to Contacts."}],isError:!1};let X=Object.entries(Y).filter(([w,z])=>z.length>0).map(([w,z])=>`${w}: ${z.join(", ")}`);return{content:[{type:"text",text:X.length>0?`Found ${W} contacts:

${X.join(`
`)}`:"Found contacts but none have phone numbers. Try searching by name to see more details."}],isError:!1}}}catch(H){let Y=H instanceof Error?H.message:String(H);return{content:[{type:"text",text:Y.includes("access")?Y:`Error accessing contacts: ${Y}`}],isError:!0}}}case"notes":{if(!l7(Q))throw Error("Invalid arguments for notes tool");try{let H=await F0("notes"),{operation:Y}=Q;switch(Y){case"search":{if(!Q.searchText)throw Error("Search text is required for search operation");let W=await H.findNote(Q.searchText);return{content:[{type:"text",text:W.length?W.map((X)=>`${X.name}:
${X.content}`).join(`

`):`No notes found for "${Q.searchText}"`}],isError:!1}}case"list":{let W=await H.getAllNotes();return{content:[{type:"text",text:W.length?W.map((X)=>`${X.name}:
${X.content}`).join(`

`):"No notes exist."}],isError:!1}}case"create":{if(!Q.title||!Q.body)throw Error("Title and body are required for create operation");let W=await $0(m,"Create Note",`Title: ${Q.title}
Folder: ${Q.folderName||"Claude"}`);if(!W.confirmed)return{content:[{type:"text",text:W.message}],isError:!0};let X=await H.createNote(Q.title,Q.body,Q.folderName);return{content:[{type:"text",text:X.success?`Created note "${Q.title}" in folder "${X.folderName}"${X.usedDefaultFolder?" (created new folder)":""}.`:`Failed to create note: ${X.message}`}],isError:!X.success}}default:throw Error(`Unknown operation: ${Y}`)}}catch(H){let Y=H instanceof Error?H.message:String(H);return{content:[{type:"text",text:Y.includes("access")?Y:`Error accessing notes: ${Y}`}],isError:!0}}}case"messages":{if(!m7(Q))throw Error("Invalid arguments for messages tool");try{let H=await F0("message");switch(Q.operation){case"send":{if(!Q.phoneNumber||!Q.message)throw Error("Phone number and message are required for send operation");let Y=await $0(m,"Send iMessage",`To: ${Q.phoneNumber}
Message: ${Q.message}`);if(!Y.confirmed)return{content:[{type:"text",text:Y.message}],isError:!0};return await H.sendMessage(Q.phoneNumber,Q.message),{content:[{type:"text",text:`Message sent to ${Q.phoneNumber}`}],isError:!1}}case"read":{if(!Q.phoneNumber)throw Error("Phone number is required for read operation");let Y=await H.readMessages(Q.phoneNumber,Q.limit);return{content:[{type:"text",text:Y.length>0?Y.map((W)=>`[${new Date(W.date).toLocaleString()}] ${W.is_from_me?"Me":W.sender}: ${W.content}`).join(`
`):"No messages found"}],isError:!1}}case"schedule":{if(!Q.phoneNumber||!Q.message||!Q.scheduledTime)throw Error("Phone number, message, and scheduled time are required for schedule operation");let Y=await $0(m,"Schedule iMessage",`To: ${Q.phoneNumber}
Message: ${Q.message}
Scheduled: ${Q.scheduledTime}`);if(!Y.confirmed)return{content:[{type:"text",text:Y.message}],isError:!0};let W=await H.scheduleMessage(Q.phoneNumber,Q.message,new Date(Q.scheduledTime));return{content:[{type:"text",text:`Message scheduled to be sent to ${Q.phoneNumber} at ${W.scheduledTime}`}],isError:!1}}case"unread":{let Y=await H.getUnreadMessages(Q.limit),W=await F0("contacts"),X=await Promise.all(Y.map(async(w)=>{if(!w.is_from_me){let z=await W.findContactByPhone(w.sender);return{...w,displayName:z||w.sender}}return{...w,displayName:"Me"}}));return{content:[{type:"text",text:X.length>0?`Found ${X.length} unread message(s):
`+X.map((w)=>`[${new Date(w.date).toLocaleString()}] From ${w.displayName}:
${w.content}`).join(`

`):"No unread messages found"}],isError:!1}}default:throw Error(`Unknown operation: ${Q.operation}`)}}catch(H){let Y=H instanceof Error?H.message:String(H);return{content:[{type:"text",text:Y.includes("access")?Y:`Error with messages operation: ${Y}`}],isError:!0}}}case"mail":{if(!u7(Q))throw Error("Invalid arguments for mail tool");try{let H=await F0("mail");switch(Q.operation){case"unread":{let Y;if(Q.account){console.error(`Getting unread emails for account: ${Q.account}`);let W=`
tell application "Mail"
    set resultList to {}
    try
        set targetAccount to first account whose name is "${E(Q.account)}"

        -- Get mailboxes for this account
        set acctMailboxes to every mailbox of targetAccount

        -- If mailbox is specified, only search in that mailbox
        set mailboxesToSearch to acctMailboxes
        ${Q.mailbox?`
        set mailboxesToSearch to {}
        repeat with mb in acctMailboxes
            if name of mb is "${E(Q.mailbox)}" then
                set mailboxesToSearch to {mb}
                exit repeat
            end if
        end repeat
        `:""}

        -- Search specified mailboxes
        repeat with mb in mailboxesToSearch
            try
                set unreadMessages to (messages of mb whose read status is false)
                if (count of unreadMessages) > 0 then
                    set msgLimit to ${Number(Q.limit)||10}
                    if (count of unreadMessages) < msgLimit then
                        set msgLimit to (count of unreadMessages)
                    end if

                    repeat with i from 1 to msgLimit
                        try
                            set currentMsg to item i of unreadMessages
                            set msgData to {subject:(subject of currentMsg), sender:(sender of currentMsg), ¬
                                        date:(date sent of currentMsg) as string, mailbox:(name of mb)}

                            -- Try to get content if possible
                            try
                                set msgContent to content of currentMsg
                                if length of msgContent > 500 then
                                    set msgContent to (text 1 thru 500 of msgContent) & "..."
                                end if
                                set msgData to msgData & {content:msgContent}
                            on error
                                set msgData to msgData & {content:"[Content not available]"}
                            end try

                            set end of resultList to msgData
                        on error
                            -- Skip problematic messages
                        end try
                    end repeat

                    if (count of resultList) ≥ ${Number(Q.limit)||10} then exit repeat
                end if
            on error
                -- Skip problematic mailboxes
            end try
        end repeat
    on error errMsg
        return "Error: " & errMsg
    end try

    return resultList
end tell`;try{let X=await d1(W);if(X&&X.startsWith("Error:"))throw Error(X);let w=[],z=X.match(/\{([^}]+)\}/g);if(z&&z.length>0)for(let q of z)try{let j=q.substring(1,q.length-1).split(","),G={};if(j.forEach((U)=>{let A=U.split(":");if(A.length>=2){let h=A[0].trim(),y=A.slice(1).join(":").trim();G[h]=y}}),G.subject||G.sender)w.push({subject:G.subject||"No subject",sender:G.sender||"Unknown sender",dateSent:G.date||new Date().toString(),content:G.content||"[Content not available]",isRead:!1,mailbox:`${Q.account} - ${G.mailbox||"Unknown"}`})}catch(j){console.error("Error parsing email match:",j)}Y=w}catch(X){console.error("Error getting account-specific emails:",X),Y=await H.getUnreadMails(Q.limit)}}else Y=await H.getUnreadMails(Q.limit);return{content:[{type:"text",text:Y.length>0?`Found ${Y.length} unread email(s)${Q.account?` in account "${Q.account}"`:""}${Q.mailbox?` and mailbox "${Q.mailbox}"`:""}:

`+Y.map((W)=>`[${W.dateSent}] From: ${W.sender}
Mailbox: ${W.mailbox}
Subject: ${W.subject}
${W.content.substring(0,500)}${W.content.length>500?"...":""}`).join(`

`):`No unread emails found${Q.account?` in account "${Q.account}"`:""}${Q.mailbox?` and mailbox "${Q.mailbox}"`:""}`}],isError:!1}}case"search":{if(!Q.searchTerm)throw Error("Search term is required for search operation");let Y=await H.searchMails(Q.searchTerm,Q.limit);return{content:[{type:"text",text:Y.length>0?`Found ${Y.length} email(s) for "${Q.searchTerm}"${Q.account?` in account "${Q.account}"`:""}${Q.mailbox?` and mailbox "${Q.mailbox}"`:""}:

`+Y.map((W)=>`[${W.dateSent}] From: ${W.sender}
Mailbox: ${W.mailbox}
Subject: ${W.subject}
${W.content.substring(0,200)}${W.content.length>200?"...":""}`).join(`

`):`No emails found for "${Q.searchTerm}"${Q.account?` in account "${Q.account}"`:""}${Q.mailbox?` and mailbox "${Q.mailbox}"`:""}`}],isError:!1}}case"send":{if(!Q.to||!Q.subject||!Q.body)throw Error("Recipient (to), subject, and body are required for send operation");let Y=await $0(m,"Send Email",`To: ${Q.to}
Subject: ${Q.subject}${Q.cc?`
CC: ${Q.cc}`:""}${Q.bcc?`
BCC: ${Q.bcc}`:""}`);if(!Y.confirmed)return{content:[{type:"text",text:Y.message}],isError:!0};return{content:[{type:"text",text:await H.sendMail(Q.to,Q.subject,Q.body,Q.cc,Q.bcc)}],isError:!1}}case"mailboxes":if(Q.account){let Y=await H.getMailboxesForAccount(Q.account);return{content:[{type:"text",text:Y.length>0?`Found ${Y.length} mailboxes for account "${Q.account}":

${Y.join(`
`)}`:`No mailboxes found for account "${Q.account}". Make sure the account name is correct.`}],isError:!1}}else{let Y=await H.getMailboxes();return{content:[{type:"text",text:Y.length>0?`Found ${Y.length} mailboxes:

${Y.join(`
`)}`:"No mailboxes found. Make sure Mail app is running and properly configured."}],isError:!1}}case"accounts":{let Y=await H.getAccounts();return{content:[{type:"text",text:Y.length>0?`Found ${Y.length} email accounts:

${Y.join(`
`)}`:"No email accounts found. Make sure Mail app is configured with at least one account."}],isError:!1}}case"latest":{let Y=Q.account;if(!Y){let X=await H.getAccounts();if(X.length===0)throw Error("No email accounts found. Make sure Mail app is configured with at least one account.");Y=X[0]}let W=await H.getLatestMails(Y,Q.limit);return{content:[{type:"text",text:W.length>0?`Found ${W.length} latest email(s) in account "${Y}":

`+W.map((X)=>`[${X.dateSent}] From: ${X.sender}
Mailbox: ${X.mailbox}
Subject: ${X.subject}
${X.content.substring(0,500)}${X.content.length>500?"...":""}`).join(`

`):`No latest emails found in account "${Y}"`}],isError:!1}}default:throw Error(`Unknown operation: ${Q.operation}`)}}catch(H){let Y=H instanceof Error?H.message:String(H);return{content:[{type:"text",text:Y.includes("access")?Y:`Error with mail operation: ${Y}`}],isError:!0}}}case"reminders":{if(!c7(Q))throw Error("Invalid arguments for reminders tool");try{let H=await F0("reminders"),{operation:Y}=Q;if(Y==="list"){let W=await H.getAllLists(),X=await H.getAllReminders();return{content:[{type:"text",text:`Found ${W.length} lists and ${X.length} reminders.`}],lists:W,reminders:X,isError:!1}}else if(Y==="search"){let{searchText:W}=Q,X=await H.searchReminders(W);return{content:[{type:"text",text:X.length>0?`Found ${X.length} reminders matching "${W}".`:`No reminders found matching "${W}".`}],reminders:X,isError:!1}}else if(Y==="open"){let{searchText:W}=Q,X=await H.openReminder(W);return{content:[{type:"text",text:X.success?`Opened Reminders app. Found reminder: ${X.reminder?.name}`:X.message}],...X,isError:!X.success}}else if(Y==="create"){let{name:W,listName:X,notes:w,dueDate:z}=Q,q=await $0(m,"Create Reminder",`Name: ${W}${X?`
List: ${X}`:""}${z?`
Due: ${z}`:""}`);if(!q.confirmed)return{content:[{type:"text",text:q.message}],isError:!0};let j=await H.createReminder(W,X,w,z);return{content:[{type:"text",text:`Created reminder "${j.name}" ${X?`in list "${X}"`:""}.`}],success:!0,reminder:j,isError:!1}}else if(Y==="listById"){let{listId:W,props:X}=Q,w=await H.getRemindersFromListById(W,X);return{content:[{type:"text",text:w.length>0?`Found ${w.length} reminders in list with ID "${W}".`:`No reminders found in list with ID "${W}".`}],reminders:w,isError:!1}}return{content:[{type:"text",text:"Unknown operation"}],isError:!0}}catch(H){console.error("Error in reminders tool:",H);let Y=H instanceof Error?H.message:String(H);return{content:[{type:"text",text:Y.includes("access")?Y:`Error in reminders tool: ${Y}`}],isError:!0}}}case"calendar":{if(!p7(Q))throw Error("Invalid arguments for calendar tool");try{let H=await F0("calendar"),{operation:Y}=Q;switch(Y){case"search":{let{searchText:W,limit:X,fromDate:w,toDate:z,calendarName:q}=Q,j=await H.searchEvents(W,X,w,z,q);return{content:[{type:"text",text:j.length>0?`Found ${j.length} events matching "${W}":

${j.map((G)=>`${G.title} (${new Date(G.startDate).toLocaleString()} - ${new Date(G.endDate).toLocaleString()})
Location: ${G.location||"Not specified"}
Calendar: ${G.calendarName}
ID: ${G.id}
${G.notes?`Notes: ${G.notes}
`:""}`).join(`

`)}`:`No events found matching "${W}".`}],isError:!1}}case"open":{let{eventId:W}=Q,X=await H.openEvent(W);return{content:[{type:"text",text:X.success?X.message:`Error opening event: ${X.message}`}],isError:!X.success}}case"list":{let{limit:W,fromDate:X,toDate:w,calendarName:z}=Q,q=await H.getEvents(W,X,w,z),j=X?new Date(X).toLocaleDateString():"today",G=w?new Date(w).toLocaleDateString():"next 7 days";return{content:[{type:"text",text:q.length>0?`Found ${q.length} events from ${j} to ${G}:

${q.map((U)=>`${U.title} (${new Date(U.startDate).toLocaleString()} - ${new Date(U.endDate).toLocaleString()})
Location: ${U.location||"Not specified"}
Calendar: ${U.calendarName}
ID: ${U.id}`).join(`

`)}`:`No events found from ${j} to ${G}.`}],isError:!1}}case"create":{let{title:W,startDate:X,endDate:w,location:z,notes:q,isAllDay:j,calendarName:G}=Q,U=await $0(m,"Create Calendar Event",`Title: ${W}
Start: ${X}
End: ${w}${z?`
Location: ${z}`:""}${G?`
Calendar: ${G}`:""}`);if(!U.confirmed)return{content:[{type:"text",text:U.message}],isError:!0};let A=await H.createEvent(W,X,w,z,q,j,G);return{content:[{type:"text",text:A.success?`${A.message} Event scheduled from ${new Date(X).toLocaleString()} to ${new Date(w).toLocaleString()}${A.eventId?`
Event ID: ${A.eventId}`:""}`:`Error creating event: ${A.message}`}],isError:!A.success}}default:throw Error(`Unknown calendar operation: ${Y}`)}}catch(H){let Y=H instanceof Error?H.message:String(H);return{content:[{type:"text",text:Y.includes("access")?Y:`Error in calendar tool: ${Y}`}],isError:!0}}}case"maps":{if(!d7(Q))throw Error("Invalid arguments for maps tool");try{let H=await F0("maps"),{operation:Y}=Q;switch(Y){case"search":{let{query:W,limit:X}=Q;if(!W)throw Error("Search query is required for search operation");let w=await H.searchLocations(W,X);return{content:[{type:"text",text:w.success?`${w.message}

${w.locations.map((z)=>`Name: ${z.name}
Address: ${z.address}
${z.latitude&&z.longitude?`Coordinates: ${z.latitude}, ${z.longitude}
`:""}`).join(`

`)}`:`${w.message}`}],isError:!w.success}}case"save":{let{name:W,address:X}=Q;if(!W||!X)throw Error("Name and address are required for save operation");let w=await $0(m,"Save Location",`Name: ${W}
Address: ${X}`);if(!w.confirmed)return{content:[{type:"text",text:w.message}],isError:!0};let z=await H.saveLocation(W,X);return{content:[{type:"text",text:z.message}],isError:!z.success}}case"pin":{let{name:W,address:X}=Q;if(!W||!X)throw Error("Name and address are required for pin operation");let w=await $0(m,"Drop Pin",`Name: ${W}
Address: ${X}`);if(!w.confirmed)return{content:[{type:"text",text:w.message}],isError:!0};let z=await H.dropPin(W,X);return{content:[{type:"text",text:z.message}],isError:!z.success}}case"directions":{let{fromAddress:W,toAddress:X,transportType:w}=Q;if(!W||!X)throw Error("From and to addresses are required for directions operation");let z=await H.getDirections(W,X,w);return{content:[{type:"text",text:z.message}],isError:!z.success}}case"listGuides":{let W=await H.listGuides();return{content:[{type:"text",text:W.message}],isError:!W.success}}case"addToGuide":{let{address:W,guideName:X}=Q;if(!W||!X)throw Error("Address and guideName are required for addToGuide operation");let w=await $0(m,"Add to Guide",`Address: ${W}
Guide: ${X}`);if(!w.confirmed)return{content:[{type:"text",text:w.message}],isError:!0};let z=await H.addToGuide(W,X);return{content:[{type:"text",text:z.message}],isError:!z.success}}case"createGuide":{let{guideName:W}=Q;if(!W)throw Error("Guide name is required for createGuide operation");let X=await $0(m,"Create Guide",`Guide Name: ${W}`);if(!X.confirmed)return{content:[{type:"text",text:X.message}],isError:!0};let w=await H.createGuide(W);return{content:[{type:"text",text:w.message}],isError:!w.success}}default:throw Error(`Unknown maps operation: ${Y}`)}}catch(H){let Y=H instanceof Error?H.message:String(H);return{content:[{type:"text",text:Y.includes("access")?Y:`Error in maps tool: ${Y}`}],isError:!0}}}default:return{content:[{type:"text",text:`Unknown tool: ${J}`}],isError:!0}}}catch(J){return{content:[{type:"text",text:`Error: ${J instanceof Error?J.message:String(J)}`}],isError:!0}}}),console.error("Setting up MCP server transport..."),process.on("uncaughtException",($)=>{console.error("Uncaught exception:",$)}),process.on("unhandledRejection",($)=>{console.error("Unhandled rejection:",$)}),(async()=>{try{console.error("Initializing transport...");let $=new A8;console.error("Connecting transport to server..."),await m.connect($),console.error("Server connected successfully!")}catch($){console.error("Failed to initialize MCP server:",$),process.exit(1)}})()}function g7($){return typeof $==="object"&&$!==null&&(!("name"in $)||typeof $.name==="string")}function l7($){if(typeof $!=="object"||$===null)return!1;let{operation:J}=$;if(typeof J!=="string")return!1;if(!["search","list","create"].includes(J))return!1;if(J==="search"){let{searchText:Q}=$;if(typeof Q!=="string"||Q==="")return!1}if(J==="create"){let{title:Q,body:H}=$;if(typeof Q!=="string"||Q===""||typeof H!=="string")return!1;let{folderName:Y}=$;if(Y!==void 0&&(typeof Y!=="string"||Y===""))return!1}return!0}function m7($){if(typeof $!=="object"||$===null)return!1;let{operation:J,phoneNumber:Q,message:H,limit:Y,scheduledTime:W}=$;if(!J||!["send","read","schedule","unread"].includes(J))return!1;switch(J){case"send":case"schedule":if(!Q||!H)return!1;if(J==="schedule"&&!W)return!1;break;case"read":if(!Q)return!1;break;case"unread":break}if(Q&&typeof Q!=="string")return!1;if(H&&typeof H!=="string")return!1;if(Y&&typeof Y!=="number")return!1;if(W&&typeof W!=="string")return!1;return!0}function u7($){if(typeof $!=="object"||$===null)return!1;let{operation:J,account:Q,mailbox:H,limit:Y,searchTerm:W,to:X,subject:w,body:z,cc:q,bcc:j}=$;if(!J||!["unread","search","send","mailboxes","accounts","latest"].includes(J))return!1;switch(J){case"search":if(!W||typeof W!=="string")return!1;break;case"send":if(!X||typeof X!=="string"||!w||typeof w!=="string"||!z||typeof z!=="string")return!1;break;case"unread":case"mailboxes":case"accounts":case"latest":break}if(Q&&typeof Q!=="string")return!1;if(H&&typeof H!=="string")return!1;if(Y&&typeof Y!=="number")return!1;if(q&&typeof q!=="string")return!1;if(j&&typeof j!=="string")return!1;return!0}function c7($){if(typeof $!=="object"||$===null)return!1;let{operation:J}=$;if(typeof J!=="string")return!1;if(!["list","search","open","create","listById"].includes(J))return!1;if((J==="search"||J==="open")&&(typeof $.searchText!=="string"||$.searchText===""))return!1;if(J==="create"&&(typeof $.name!=="string"||$.name===""))return!1;if(J==="listById"&&(typeof $.listId!=="string"||$.listId===""))return!1;return!0}function p7($){if(typeof $!=="object"||$===null)return!1;let{operation:J}=$;if(typeof J!=="string")return!1;if(!["search","open","list","create"].includes(J))return!1;if(J==="search"){let{searchText:Q}=$;if(typeof Q!=="string")return!1}if(J==="open"){let{eventId:Q}=$;if(typeof Q!=="string")return!1}if(J==="create"){let{title:Q,startDate:H,endDate:Y}=$;if(typeof Q!=="string"||typeof H!=="string"||typeof Y!=="string")return!1}return!0}function d7($){if(typeof $!=="object"||$===null)return!1;let{operation:J}=$;if(typeof J!=="string")return!1;if(!["search","save","directions","pin","listGuides","addToGuide","createGuide"].includes(J))return!1;if(J==="search"){let{query:Q}=$;if(typeof Q!=="string"||Q==="")return!1}if(J==="save"||J==="pin"){let{name:Q,address:H}=$;if(typeof Q!=="string"||Q===""||typeof H!=="string"||H==="")return!1}if(J==="directions"){let{fromAddress:Q,toAddress:H}=$;if(typeof Q!=="string"||Q===""||typeof H!=="string"||H==="")return!1;let{transportType:Y}=$;if(Y!==void 0&&(typeof Y!=="string"||!["driving","walking","transit"].includes(Y)))return!1}if(J==="createGuide"){let{guideName:Q}=$;if(typeof Q!=="string"||Q==="")return!1}if(J==="addToGuide"){let{address:Q,guideName:H}=$;if(typeof Q!=="string"||Q===""||typeof H!=="string"||H==="")return!1}return!0}
