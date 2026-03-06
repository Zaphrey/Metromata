import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { parse } from 'papaparse';
import { firstValueFrom } from 'rxjs';

// Derived from the calendar data file
export type MartaCalendar = {
  service_id: string,
  monday: number,
  tuesday: number,
  wednesday: number,
  thursday: number,
  friday: number,
  saturday: number,
  sunday: number,
  start_date: string,
  end_date: string,
}

@Injectable({
  providedIn: 'root',
})
export class MartaCalendarService {
  private loadingPromise?: Promise<void>;
  private loaded = false;
  private calendarMap: Map<string, MartaCalendar> = new Map();

  constructor(private httpClient: HttpClient) {}

  // Loads in the calendar data from public/assets/static-transit-information/calendar.txt
  async loadCalendar() {
    if (this.loadingPromise || this.loaded)
      return;
    
    this.loadingPromise = ( async () => {
      // Use the HTTP client to pull the file data from the page
      const file = await firstValueFrom(this.httpClient.get("assets/static-transit-information/calendar.txt", { responseType: "text" }));

      // Parse out the data from the file with Papa Parse
      parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        fastMode: true,
        step: (row: { data?: {} }) => { // Called each row that's parsed
          // Maps the calendar to the calenderMap by service id
          const calendar = row.data as MartaCalendar;
          calendar.service_id = calendar.service_id.toString();
          this.calendarMap.set(calendar.service_id, calendar);
        },
        complete: () => {
          this.loaded = true;
          console.log("Calendars loaded");
        },
      });
    })();

    return this.loadingPromise
  }

  async getCalender(serviceId: string): Promise<MartaCalendar | undefined> {
    await this.loadCalendar();
    return this.calendarMap.get(serviceId);
  }

  async getCalendarMap(): Promise<Map<string, MartaCalendar> | undefined> {
    await this.loadCalendar();
    return new Map(this.calendarMap);
  }
}
