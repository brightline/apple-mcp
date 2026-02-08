#!/usr/bin/env swift

import EventKit
import Foundation

// MARK: - JSON Output Helpers

struct CalendarEventJSON: Codable {
	let id: String
	let title: String
	let location: String?
	let notes: String?
	let startDate: String?
	let endDate: String?
	let calendarName: String
	let isAllDay: Bool
	let url: String?
}

struct CalendarInfo: Codable {
	let name: String
	let type: String
	let color: String
}

let isoFormatter: ISO8601DateFormatter = {
	let f = ISO8601DateFormatter()
	f.formatOptions = [.withInternetDateTime]
	return f
}()

func eventToJSON(_ event: EKEvent) -> CalendarEventJSON {
	return CalendarEventJSON(
		id: event.eventIdentifier ?? "unknown",
		title: event.title ?? "Untitled",
		location: event.location,
		notes: event.notes,
		startDate: event.startDate.map { isoFormatter.string(from: $0) },
		endDate: event.endDate.map { isoFormatter.string(from: $0) },
		calendarName: event.calendar?.title ?? "Unknown",
		isAllDay: event.isAllDay,
		url: event.url?.absoluteString
	)
}

func outputJSON<T: Encodable>(_ value: T) {
	let encoder = JSONEncoder()
	encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
	if let data = try? encoder.encode(value) {
		print(String(data: data, encoding: .utf8)!)
	} else {
		print("[]")
	}
}

func exitError(_ message: String) -> Never {
	let errorJSON: [String: String] = ["error": message]
	if let data = try? JSONSerialization.data(withJSONObject: errorJSON),
	   let str = String(data: data, encoding: .utf8) {
		FileHandle.standardError.write(str.data(using: .utf8)!)
	}
	fputs(message + "\n", stderr)
	exit(1)
}

// MARK: - EventKit Access

func ensureAccess(store: EKEventStore) {
	let status: EKAuthorizationStatus
	if #available(macOS 14.0, *) {
		status = EKEventStore.authorizationStatus(for: .event)
	} else {
		status = EKEventStore.authorizationStatus(for: .event)
	}

	switch status {
	case .authorized:
		return // Already have access
	case .fullAccess:
		return // macOS 14+ full access granted
	case .denied:
		exitError(
			"Calendar access was denied. To fix:\n" +
			"1. Open System Settings > Privacy & Security > Calendars\n" +
			"2. Enable access for your terminal app (e.g. Terminal, iTerm, Warp)\n" +
			"3. Restart your terminal and try again"
		)
	case .restricted:
		exitError("Calendar access is restricted by a system policy (e.g. MDM profile).")
	case .notDetermined:
		// First time — request access
		let semaphore = DispatchSemaphore(value: 0)
		var granted = false

		if #available(macOS 14.0, *) {
			store.requestFullAccessToEvents { g, error in
				granted = g
				if let error = error {
					fputs("EventKit access error: \(error.localizedDescription)\n", stderr)
				}
				semaphore.signal()
			}
		} else {
			store.requestAccess(to: .event) { g, error in
				granted = g
				if let error = error {
					fputs("EventKit access error: \(error.localizedDescription)\n", stderr)
				}
				semaphore.signal()
			}
		}

		semaphore.wait()
		if !granted {
			exitError(
				"Calendar access was not granted. To fix:\n" +
				"1. Open System Settings > Privacy & Security > Calendars\n" +
				"2. Enable access for your terminal app\n" +
				"3. Restart your terminal and try again"
			)
		}
	case .writeOnly:
		exitError(
			"Calendar access is write-only — full access is required to read events.\n" +
			"1. Open System Settings > Privacy & Security > Calendars\n" +
			"2. Change access for your terminal app from 'Add Events Only' to 'Full Access'\n" +
			"3. Restart your terminal and try again"
		)
	@unknown default:
		// Future status — try requesting anyway
		let semaphore = DispatchSemaphore(value: 0)
		var granted = false
		if #available(macOS 14.0, *) {
			store.requestFullAccessToEvents { g, _ in
				granted = g
				semaphore.signal()
			}
		} else {
			store.requestAccess(to: .event) { g, _ in
				granted = g
				semaphore.signal()
			}
		}
		semaphore.wait()
		if !granted {
			exitError("Calendar access denied (unknown authorization status).")
		}
	}
}

// MARK: - Commands

func listEvents(store: EKEventStore, from: Date, to: Date, calendarName: String?, limit: Int) {
	var calendars = store.calendars(for: .event)
	if let name = calendarName {
		calendars = calendars.filter { $0.title == name }
		if calendars.isEmpty {
			exitError("Calendar '\(name)' not found")
		}
	}

	let predicate = store.predicateForEvents(withStart: from, end: to, calendars: calendars)
	let events = store.events(matching: predicate)

	let sorted = events.sorted { ($0.startDate ?? .distantPast) < ($1.startDate ?? .distantPast) }
	let limited = Array(sorted.prefix(limit))
	outputJSON(limited.map(eventToJSON))
}

func searchEvents(store: EKEventStore, query: String, from: Date, to: Date, calendarName: String?, limit: Int) {
	var calendars = store.calendars(for: .event)
	if let name = calendarName {
		calendars = calendars.filter { $0.title == name }
		if calendars.isEmpty {
			exitError("Calendar '\(name)' not found")
		}
	}

	let predicate = store.predicateForEvents(withStart: from, end: to, calendars: calendars)
	let events = store.events(matching: predicate)

	let lowerQuery = query.lowercased()
	let matched = events.filter { event in
		if let title = event.title, title.lowercased().contains(lowerQuery) { return true }
		if let notes = event.notes, notes.lowercased().contains(lowerQuery) { return true }
		if let location = event.location, location.lowercased().contains(lowerQuery) { return true }
		return false
	}

	let sorted = matched.sorted { ($0.startDate ?? .distantPast) < ($1.startDate ?? .distantPast) }
	let limited = Array(sorted.prefix(limit))
	outputJSON(limited.map(eventToJSON))
}

func listCalendars(store: EKEventStore) {
	let calendars = store.calendars(for: .event)
	let infos = calendars.map { cal -> CalendarInfo in
		let typeStr: String
		switch cal.type {
		case .local: typeStr = "local"
		case .calDAV: typeStr = "calDAV"
		case .exchange: typeStr = "exchange"
		case .subscription: typeStr = "subscription"
		case .birthday: typeStr = "birthday"
		@unknown default: typeStr = "unknown"
		}

		// Convert CGColor to hex
		var colorHex = "#000000"
		if let cgColor = cal.cgColor,
		   let components = cgColor.components,
		   cgColor.numberOfComponents >= 3 {
			let r = Int(components[0] * 255)
			let g = Int(components[1] * 255)
			let b = Int(components[2] * 255)
			colorHex = String(format: "#%02x%02x%02x", r, g, b)
		}

		return CalendarInfo(name: cal.title, type: typeStr, color: colorHex)
	}
	outputJSON(infos)
}

// MARK: - Argument Parsing

func parseDate(_ str: String) -> Date? {
	// Try ISO 8601 first
	if let d = isoFormatter.date(from: str) { return d }
	// Try date-only format (YYYY-MM-DD)
	let dateOnly = DateFormatter()
	dateOnly.dateFormat = "yyyy-MM-dd"
	dateOnly.timeZone = TimeZone.current
	return dateOnly.date(from: str)
}

func getArg(_ args: [String], flag: String) -> String? {
	guard let idx = args.firstIndex(of: flag), idx + 1 < args.count else { return nil }
	return args[idx + 1]
}

// MARK: - Main

let args = Array(CommandLine.arguments.dropFirst())

guard let command = args.first else {
	exitError("Usage: calendar-helper <list-events|search-events|list-calendars> [options]")
}

let store = EKEventStore()
ensureAccess(store: store)

switch command {
case "list-events":
	let fromStr = getArg(args, flag: "--from")
	let toStr = getArg(args, flag: "--to")
	let calName = getArg(args, flag: "--calendar")
	let limitStr = getArg(args, flag: "--limit")
	let limit = limitStr.flatMap(Int.init) ?? 50

	let now = Date()
	let from = fromStr.flatMap(parseDate) ?? Calendar.current.startOfDay(for: now)
	let to = toStr.flatMap(parseDate) ?? Calendar.current.date(byAdding: .day, value: 7, to: from)!

	listEvents(store: store, from: from, to: to, calendarName: calName, limit: limit)

case "search-events":
	guard let query = getArg(args, flag: "--query"), !query.isEmpty else {
		exitError("--query is required for search-events")
	}
	let fromStr = getArg(args, flag: "--from")
	let toStr = getArg(args, flag: "--to")
	let calName = getArg(args, flag: "--calendar")
	let limitStr = getArg(args, flag: "--limit")
	let limit = limitStr.flatMap(Int.init) ?? 50

	let now = Date()
	let from = fromStr.flatMap(parseDate) ?? Calendar.current.startOfDay(for: now)
	let to = toStr.flatMap(parseDate) ?? Calendar.current.date(byAdding: .day, value: 30, to: from)!

	searchEvents(store: store, query: query, from: from, to: to, calendarName: calName, limit: limit)

case "list-calendars":
	listCalendars(store: store)

default:
	exitError("Unknown command: \(command). Use list-events, search-events, or list-calendars.")
}
