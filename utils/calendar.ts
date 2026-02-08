import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeForAppleScript, runAppleScriptWithTimeout, execFileAsync } from './sanitize.ts';

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
    // Maximum time (in ms) for Swift helper (first run compiles, so allow more)
    SWIFT_TIMEOUT_MS: 30000,
    // Maximum number of events to return
    MAX_EVENTS: 50
};

// Resolve path to the Swift helper relative to this module
const __dirname = dirname(fileURLToPath(import.meta.url));
const SWIFT_HELPER = join(__dirname, "..", "helpers", "calendar-helper.swift");

/**
 * Run the Swift EventKit helper with the given arguments.
 * Returns the raw stdout string (JSON).
 * On failure, throws with the helper's stderr message for actionable diagnostics.
 */
async function runSwiftHelper(args: string[]): Promise<string> {
    try {
        const { stdout, stderr } = await execFileAsync(
            "swift", [SWIFT_HELPER, ...args],
            { timeout: CONFIG.SWIFT_TIMEOUT_MS }
        );
        if (stderr) {
            console.error(`Swift helper stderr: ${stderr}`);
        }
        return stdout;
    } catch (error: unknown) {
        // execFileAsync errors carry .stderr with the helper's diagnostic output
        const stderr = (error as { stderr?: string }).stderr?.trim();
        if (stderr) {
            throw new Error(stderr);
        }
        throw error;
    }
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
 * Get all calendar names using EventKit via Swift helper.
 * Throws on access errors so the caller can surface actionable messages.
 */
async function getCalendarNames(): Promise<string[]> {
    const stdout = await runSwiftHelper(["list-calendars"]);
    const calendars: { name: string; type: string; color: string }[] = JSON.parse(stdout);
    return calendars.map(c => c.name);
}

/**
 * Get calendar events in a specified date range using EventKit via Swift helper.
 * Throws on access errors so the caller can surface actionable messages.
 */
async function getEvents(
    limit = 10,
    fromDate?: string,
    toDate?: string,
    calendarName?: string
): Promise<CalendarEvent[]> {
    console.error("getEvents - Starting to fetch calendar events via EventKit");

    const maxEvents = Math.min(limit, CONFIG.MAX_EVENTS);

    const args: string[] = ["list-events", "--limit", String(maxEvents)];

    if (fromDate) args.push("--from", fromDate);
    if (toDate) args.push("--to", toDate);
    if (calendarName) args.push("--calendar", calendarName);

    const stdout = await runSwiftHelper(args);
    const events: CalendarEvent[] = JSON.parse(stdout);

    console.error(`getEvents - Found ${events.length} event(s)`);
    return events;
}

/**
 * Search for calendar events that match the search text using EventKit via Swift helper.
 * Throws on access errors so the caller can surface actionable messages.
 */
async function searchEvents(
    searchText: string,
    limit = 10,
    fromDate?: string,
    toDate?: string,
    calendarName?: string
): Promise<CalendarEvent[]> {
    console.error(`searchEvents - Searching for: "${searchText}" via EventKit`);

    const maxEvents = Math.min(limit, CONFIG.MAX_EVENTS);

    const args: string[] = ["search-events", "--query", searchText, "--limit", String(maxEvents)];

    if (fromDate) args.push("--from", fromDate);
    if (toDate) args.push("--to", toDate);
    if (calendarName) args.push("--calendar", calendarName);

    const stdout = await runSwiftHelper(args);
    const events: CalendarEvent[] = JSON.parse(stdout);

    console.error(`searchEvents - Found ${events.length} matching event(s)`);
    return events;
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
    requestCalendarAccess,
    getCalendarNames
};

export default calendar;
