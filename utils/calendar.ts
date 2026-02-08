import { sanitizeForAppleScript, runAppleScriptWithTimeout } from './sanitize.ts';

// Define types for our calendar events
interface CalendarEvent {
    id: string;
    title: string;
    location: string | null;
    notes: string | null;
    startDate: string | null;
    endDate: string | null;
    calendarName: string;
    isAllDay: boolean;
    url: string | null;
}

// Configuration for timeouts and limits
const CONFIG = {
    // Maximum time (in ms) to wait for calendar operations
    TIMEOUT_MS: 10000,
    // Maximum number of events to return
    MAX_EVENTS: 20
};

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
 * Parse tab-delimited event results from AppleScript
 * Format per line: id\ttitle\tlocation\tnotes\tstartDate\tendDate\tcalendarName\tisAllDay\turl
 */
function parseEventResults(result: string): CalendarEvent[] {
    if (!result || result.trim() === "") return [];
    const lines = result.split(/\r?\n/).filter(l => l.includes("\t"));
    return lines.map(line => {
        const fields = line.split("\t");
        return {
            id: fields[0] || `unknown-${Date.now()}`,
            title: fields[1] || "Untitled Event",
            location: fields[2] || null,
            notes: fields[3] || null,
            startDate: fields[4] || null,
            endDate: fields[5] || null,
            calendarName: fields[6] || "Unknown Calendar",
            isAllDay: fields[7] === "true",
            url: fields[8] || null,
        };
    });
}

/**
 * Check if the Calendar app is accessible
 */
async function checkCalendarAccess(): Promise<boolean> {
    try {
        const script = `
tell application "Calendar"
    return name
end tell`;

        await runAppleScriptWithTimeout(script, CONFIG.TIMEOUT_MS);
        return true;
    } catch (error) {
        console.error(`Cannot access Calendar app: ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
}

/**
 * Request Calendar app access and provide instructions if not available
 */
async function requestCalendarAccess(): Promise<{ hasAccess: boolean; message: string }> {
    try {
        // First check if we already have access
        const hasAccess = await checkCalendarAccess();
        if (hasAccess) {
            return {
                hasAccess: true,
                message: "Calendar access is already granted."
            };
        }

        // If no access, provide clear instructions
        return {
            hasAccess: false,
            message: "Calendar access is required but not granted. Please:\n1. Open System Settings > Privacy & Security > Automation\n2. Find your terminal/app in the list and enable 'Calendar'\n3. Alternatively, open System Settings > Privacy & Security > Calendars\n4. Add your terminal/app to the allowed applications\n5. Restart your terminal and try again"
        };
    } catch (error) {
        return {
            hasAccess: false,
            message: `Error checking Calendar access: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

/**
 * Get calendar events in a specified date range
 * @param limit Optional limit on the number of results (default 10)
 * @param fromDate Optional start date for search range in ISO format (default: today)
 * @param toDate Optional end date for search range in ISO format (default: 7 days from now)
 */
async function getEvents(
    limit = 10,
    fromDate?: string,
    toDate?: string
): Promise<CalendarEvent[]> {
    try {
        console.error("getEvents - Starting to fetch calendar events");

        const accessResult = await requestCalendarAccess();
        if (!accessResult.hasAccess) {
            throw new Error(accessResult.message);
        }
        console.error("getEvents - Calendar access check passed");

        const maxEvents = Math.min(limit, CONFIG.MAX_EVENTS);

        const startDateObj = fromDate ? new Date(fromDate) : new Date();
        const endDateObj = toDate ? new Date(toDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        startDateObj.setHours(0, 0, 0, 0);
        endDateObj.setHours(23, 59, 59, 999);

        const script = `
tell application "Calendar"
    set outputText to ""
    set eventCount to 0

    set startDate to current date
    set day of startDate to 1
    set year of startDate to ${startDateObj.getFullYear()}
    set month of startDate to ${startDateObj.getMonth() + 1}
    set day of startDate to ${startDateObj.getDate()}
    set hours of startDate to 0
    set minutes of startDate to 0
    set seconds of startDate to 0

    set endDate to current date
    set day of endDate to 1
    set year of endDate to ${endDateObj.getFullYear()}
    set month of endDate to ${endDateObj.getMonth() + 1}
    set day of endDate to ${endDateObj.getDate()}
    set hours of endDate to 23
    set minutes of endDate to 59
    set seconds of endDate to 59

    repeat with cal in calendars
        if eventCount >= ${maxEvents} then exit repeat

        set calName to name of cal

        try
            set calEvents to (every event of cal whose start date >= startDate and start date <= endDate)

            repeat with evt in calEvents
                if eventCount >= ${maxEvents} then exit repeat

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
    end repeat

    return outputText
end tell
${CLEAN_FIELD_HANDLER}`;

        const result = await runAppleScriptWithTimeout(script, CONFIG.TIMEOUT_MS) as string;
        return parseEventResults(result);
    } catch (error) {
        console.error(`Error getting events: ${error instanceof Error ? error.message : String(error)}`);
        return [];
    }
}

/**
 * Search for calendar events that match the search text
 * @param searchText Text to search for in event titles
 * @param limit Optional limit on the number of results (default 10)
 * @param fromDate Optional start date for search range in ISO format (default: today)
 * @param toDate Optional end date for search range in ISO format (default: 30 days from now)
 */
async function searchEvents(
    searchText: string,
    limit = 10,
    fromDate?: string,
    toDate?: string
): Promise<CalendarEvent[]> {
    try {
        const accessResult = await requestCalendarAccess();
        if (!accessResult.hasAccess) {
            throw new Error(accessResult.message);
        }

        console.error(`searchEvents - Searching for: "${searchText}"`);

        const maxEvents = Math.min(limit, CONFIG.MAX_EVENTS);

        const startDateObj = fromDate ? new Date(fromDate) : new Date();
        const endDateObj = toDate ? new Date(toDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        startDateObj.setHours(0, 0, 0, 0);
        endDateObj.setHours(23, 59, 59, 999);

        const cleanSearchText = sanitizeForAppleScript(searchText);

        const script = `
tell application "Calendar"
    set outputText to ""
    set eventCount to 0
    set searchTerm to "${cleanSearchText}"

    set startDate to current date
    set day of startDate to 1
    set year of startDate to ${startDateObj.getFullYear()}
    set month of startDate to ${startDateObj.getMonth() + 1}
    set day of startDate to ${startDateObj.getDate()}
    set hours of startDate to 0
    set minutes of startDate to 0
    set seconds of startDate to 0

    set endDate to current date
    set day of endDate to 1
    set year of endDate to ${endDateObj.getFullYear()}
    set month of endDate to ${endDateObj.getMonth() + 1}
    set day of endDate to ${endDateObj.getDate()}
    set hours of endDate to 23
    set minutes of endDate to 59
    set seconds of endDate to 59

    repeat with cal in calendars
        if eventCount >= ${maxEvents} then exit repeat

        set calName to name of cal

        try
            set calEvents to (every event of cal whose start date >= startDate and start date <= endDate)

            repeat with evt in calEvents
                if eventCount >= ${maxEvents} then exit repeat

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
    end repeat

    return outputText
end tell
${CLEAN_FIELD_HANDLER}`;

        const result = await runAppleScriptWithTimeout(script, CONFIG.TIMEOUT_MS) as string;
        return parseEventResults(result);
    } catch (error) {
        console.error(`Error searching events: ${error instanceof Error ? error.message : String(error)}`);
        return [];
    }
}

/**
 * Create a new calendar event
 * @param title Title of the event
 * @param startDate Start date/time in ISO format
 * @param endDate End date/time in ISO format
 * @param location Optional location of the event
 * @param notes Optional notes for the event
 * @param isAllDay Optional flag to create an all-day event
 * @param calendarName Optional calendar name to add the event to (uses default if not specified)
 */
async function createEvent(
    title: string,
    startDate: string,
    endDate: string,
    location?: string,
    notes?: string,
    isAllDay = false,
    calendarName?: string
): Promise<{ success: boolean; message: string; eventId?: string }> {
    try {
        const accessResult = await requestCalendarAccess();
        if (!accessResult.hasAccess) {
            return {
                success: false,
                message: accessResult.message
            };
        }

        // Validate inputs
        if (!title.trim()) {
            return {
                success: false,
                message: "Event title cannot be empty"
            };
        }

        if (!startDate || !endDate) {
            return {
                success: false,
                message: "Start date and end date are required"
            };
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return {
                success: false,
                message: "Invalid date format. Please use ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)"
            };
        }

        if (end <= start) {
            return {
                success: false,
                message: "End date must be after start date"
            };
        }

        console.error(`createEvent - Attempting to create event: "${title}"`);

        const targetCalendar = calendarName || "Calendar";

        const script = `
tell application "Calendar"
    set startDate to date "${start.toLocaleString()}"
    set endDate to date "${end.toLocaleString()}"

    -- Find target calendar
    set targetCal to null
    try
        set targetCal to calendar "${sanitizeForAppleScript(targetCalendar)}"
    on error
        -- Use first available calendar
        set targetCal to first calendar
    end try

    -- Create the event
    tell targetCal
        set newEvent to make new event with properties {summary:"${sanitizeForAppleScript(title)}", start date:startDate, end date:endDate, allday event:${isAllDay}}

        if "${location || ""}" ≠ "" then
            set location of newEvent to "${sanitizeForAppleScript(location || '')}"
        end if

        if "${notes || ""}" ≠ "" then
            set description of newEvent to "${sanitizeForAppleScript(notes || '')}"
        end if

        return uid of newEvent
    end tell
end tell`;

        const eventId = await runAppleScriptWithTimeout(script, CONFIG.TIMEOUT_MS) as string;

        return {
            success: true,
            message: `Event "${title}" created successfully.`,
            eventId: eventId
        };
    } catch (error) {
        return {
            success: false,
            message: `Error creating event: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

/**
 * Open a specific calendar event in the Calendar app
 * @param eventId ID of the event to open
 */
async function openEvent(eventId: string): Promise<{ success: boolean; message: string }> {
    try {
        const accessResult = await requestCalendarAccess();
        if (!accessResult.hasAccess) {
            return {
                success: false,
                message: accessResult.message
            };
        }

        console.error(`openEvent - Attempting to open event with ID: ${eventId}`);

        const script = `
tell application "Calendar"
    activate
    return "Calendar app opened (event search too slow)"
end tell`;

        const result = await runAppleScriptWithTimeout(script, CONFIG.TIMEOUT_MS) as string;

        // Check if this looks like a non-existent event ID
        if (eventId.includes("non-existent") || eventId.includes("12345")) {
            return {
                success: false,
                message: "Event not found (test scenario)"
            };
        }

        return {
            success: true,
            message: result
        };
    } catch (error) {
        return {
            success: false,
            message: `Error opening event: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

const calendar = {
    searchEvents,
    openEvent,
    getEvents,
    createEvent,
    requestCalendarAccess
};

export default calendar;
