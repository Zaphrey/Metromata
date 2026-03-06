import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { parse } from 'papaparse';
import { firstValueFrom } from 'rxjs';
import { MartaCalendarDateService } from './marta-calendar-date.service';
import { MartaTripService } from './marta-trip.service';
import { MartaCalendar, MartaCalendarService } from './marta-calendar.service';

// Derived from the stop times data file
export type MartaStopTime = {
  trip_id: string,
  arrival_time: string,
  departure_time: string,
  stop_id: string,
  stop_sequence: string,
  stop_headsign: string,
  pickup_type: string,
  drop_off_type: string,
  shape_dist_traveled: string,
  timepoint: string,
  converted_time?: string
  arrival_date?: Date
}

@Injectable({
  providedIn: 'root',
})
export class MartaStopTimeService {
  private stopTimesById: Map<string, MartaStopTime[]> = new Map();
  private stopTimesByTrip: Map<string, MartaStopTime[]> = new Map();

  private loadingPromise?: Promise<void>;
  private loaded = false;

  constructor(private httpClient: HttpClient, 
    private martaCalendarDateService: MartaCalendarDateService,
    private martaCalendarService: MartaCalendarService,
    private martaTripService: MartaTripService) {
  }

  // Loads in the stop time data from public/assets/static-transit-information/stop_times.txt
  async loadStopTimes(): Promise<void>
  {
    if (this.loadingPromise || this.loaded)
      return;

    this.loadingPromise = ( async () => {
      // Use the HTTP client to pull the file data from the page
      const file = await firstValueFrom(this.httpClient.get("assets/static-transit-information/stop_times.txt", { responseType: "text" }));

      // Parse out the data from the file with Papa Parse
      parse(file, {
        header: true,
        skipEmptyLines: true,
        fastMode: true,
        step: (row: { data?: {} }) => { // Called each row that's parsed
          // Map the stop time to both the stopTimesById stopTimesByTrip maps
          const stopTime = row.data as MartaStopTime;

          // Stop index
          if (!this.stopTimesById.has(stopTime.stop_id))
            this.stopTimesById.set(stopTime.stop_id, []);

          this.stopTimesById.get(stopTime.stop_id)!.push(stopTime);

          // Trip index
          if (!this.stopTimesByTrip.has(stopTime.trip_id))
            this.stopTimesByTrip.set(stopTime.trip_id, []);

          this.stopTimesByTrip.get(stopTime.trip_id)!.push(stopTime);
        },
        complete: () => {
          this.loaded = true;

          // Sort the stop times by sequence once we've finished ingesting all the stop time data
          for (const times of this.stopTimesByTrip.values()) {
            times.sort((a, b) =>
              Number(a.stop_sequence) - Number(b.stop_sequence)
            );
          }

          console.log("Arrival stop times loaded");
        },
      });
    })();

    return this.loadingPromise
  }

  async getTripStops(tripId: string): Promise<MartaStopTime[] | undefined> {
    await this.loadStopTimes()
    return this.stopTimesByTrip.get(tripId);
  }

  // Gets the next 5 or less upcoming stop times for the specific stop
  async getArrivalTimes(stopId: string): Promise<MartaStopTime[] | undefined> {
    await this.loadStopTimes();

    const stopTimes = this.stopTimesById.get(stopId) ?? [];
    const currentDate = new Date();
    const currentTime = currentDate.getTime();

    const yyyy_mm_dd_date = currentDate.getFullYear().toString()
      + (currentDate.getMonth() + 1).toString().padStart(2, "0")
      + currentDate.getDate().toString().padStart(2, "0");
    const weekDay = currentDate.getDay();

    // Create an active services set for service exceptions
    // https://gtfs.org/documentation/schedule/reference/#calendartxt
    const activeServices = new Set<string>();

    // Calendar information gotten from public/assets/static-transit-information/calendar.txt
    if (weekDay >= 1 && weekDay <= 5) {
      activeServices.add("5"); // Service 5 operates between Mondays and Fridays
    } else if (weekDay === 6) {
      activeServices.add("3"); // Service 3 operates only on Saturdays
    } else {
      activeServices.add("4"); // Service 4 operates only on Sundays
    }

    const serviceCalendars = await this.martaCalendarService.getCalendarMap() ?? new Map<string, MartaCalendar>();
    const calendarDates = await this.martaCalendarDateService.getCalenderDates();
    const seen = new Set<string>();

    if (calendarDates) {
      // Iterate through the calendar date and determine if 
      // any of the dates in there matches up with the current date
      for (const calendarDate of calendarDates?.values()) {
        if (yyyy_mm_dd_date == calendarDate.date) {
          // https://gtfs.org/documentation/schedule/reference/#calendar_datestxt
          // If so, look up the exception type
          // 1 means add it to the active services
          if (calendarDate.exception_type === 1)
            activeServices.add(calendarDate.service_id);

          // 2 means remove it from the active services
          if (calendarDate.exception_type === 2)
            activeServices.delete(calendarDate.service_id);
        }
      }
    }

    return stopTimes.map(stopTime => {
      const [hour, minute] = stopTime.arrival_time.trim().split(":");

      // Sets the arrival time to time since midnight, which allows us to get the appropriate arrival times
      const arrivalTime = new Date(currentDate);
      arrivalTime.setHours(0, 0, 0, 0);
      arrivalTime.setHours(+hour, +minute, 0);

      return { ...stopTime, arrival_date: arrivalTime }
    })
    .filter(stopTime => { 
      // Filters out any trips before the current time, outside of the service date, and ones with inactive services
      const trip = this.martaTripService.getTripFromId(stopTime.trip_id)

      // Ensure we're only getting arrival times after the current time
      if (stopTime.arrival_date.getTime() <= currentTime)
        return false;
      
      // Ensure the trip we've selected is active
      if (!trip || (trip && !activeServices.has(trip.service_id)))
        return false;

      // Get the service calendar
      const serviceCalendar = serviceCalendars.get(trip.service_id);

      if (!serviceCalendar)
        return false;

      // Check if we're in range of the service calendar's service dates
      if (yyyy_mm_dd_date < serviceCalendar.start_date || yyyy_mm_dd_date > serviceCalendar.end_date)
        return false;

      // Create a key to store in a set which allows us to check if we've already seen it
      const key = `${trip.route_id}-${stopTime.arrival_date.getTime()}`;

      // Check if we've "seen" this arrival time before
      // Prevents duplicate entries
      if (seen.has(key))
        return false;

      // Add it to the seen set and return true
      seen.add(key);

      return true;
    })
    .sort((a, b) => a.arrival_date.getTime() - b.arrival_date.getTime()) // Sort it by arrival time
    .slice(0, 5) // Get the first 5 entries
    .map(stopTime => (
      // Get the two digit hour and minute times for the stops
      { ...stopTime, converted_time: stopTime.arrival_date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) 
    }));
  }
}
