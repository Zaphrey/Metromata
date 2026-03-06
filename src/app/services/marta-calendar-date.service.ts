import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { parse } from 'papaparse';
import { firstValueFrom } from 'rxjs';

// Derived from the calendar date data file
export type MartaCalendarDate = {
  service_id: string,
  date: string,
  exception_type: number,
}

@Injectable({
  providedIn: 'root',
})
export class MartaCalendarDateService {
  private loadingPromise?: Promise<void>;
  private loaded = false;
  private calendarDateMap: Map<string, MartaCalendarDate> = new Map();

  constructor(private httpClient: HttpClient) {}

  // Loads in the calendar date data from public/assets/static-transit-information/calendar_dates.txt
  async loadCalendar() {
    if (this.loadingPromise || this.loaded)
      return;

    
    this.loadingPromise = (async () => {
      // Use the HTTP client to pull the file data from the page
      const file = await firstValueFrom(this.httpClient.get("assets/static-transit-information/calendar.txt", { responseType: "text" }));

      // Parse out the data from the file with Papa Parse
      parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        fastMode: true,
        step: (row: { data?: {} }) => {
          // Maps the calendar date to the calenderDateMap by service id
          const calendar = row.data as MartaCalendarDate;
          calendar.service_id = calendar.service_id.toString();
          this.calendarDateMap.set(calendar.service_id, calendar);
        },
        complete: () => {
          this.loaded = true;
          console.log("Calendar dates loaded");
        },
      });
    })();

    return this.loadingPromise
  }

  async getCalenderDate(serviceId: string): Promise<MartaCalendarDate | undefined> {
    await this.loadCalendar();
    return this.calendarDateMap.get(serviceId);
  }

  async getCalenderDates(): Promise<Map<string, MartaCalendarDate> | undefined> {
    await this.loadCalendar();
    return new Map(this.calendarDateMap);
  }
}
