import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { parse } from 'papaparse';
import { firstValueFrom } from 'rxjs';

// Derived from the agency data file
export type Agency = {
  agency_id: string,
  agency_name: string,
  agency_url: string,
  agency_timezone: string,
  agency_lang: string,
  agency_phone: string,
  agency_fare_url: string
}

@Injectable({
  providedIn: 'root',
})
export class MartaAgencyService {
  private loadingPromise?: Promise<void>
  private loaded = false;

  private agencyMap: Map<string, Agency> = new Map();

  constructor(private httpClient: HttpClient) {}

  // Loads in the agency data from public/assets/static-transit-information/agency.txt
  async loadAgencies(): Promise<void> {
    if (this.loadingPromise || this.loaded)
      return;

    this.loadingPromise = (async () => {
      // Use the HTTP client to pull the file data from the page
      const file = await firstValueFrom(this.httpClient.get("assets/static-transit-information/agency.txt", { responseType: "text" }));
      
      // Parse out the data from the file with Papa Parse
      parse(file, {
        header: true,
        skipEmptyLines: true,
        fastMode: true,
        step: (row: { data?: {} }) => {
          // Maps the agency to the agency map by agency id
          const agency = row.data as Agency;
          this.agencyMap.set(agency.agency_id, agency);
        },
        complete: () => {
          this.loaded = true;
          console.log("Agencies loaded");
        },
      });
    })();

    return this.loadingPromise;
  }

  async getAgency(agencyId: string): Promise<Agency | undefined> {
    await this.loadAgencies();
    return this.agencyMap.get(agencyId);
  }
}
