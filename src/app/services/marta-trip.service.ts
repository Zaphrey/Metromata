import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { parse } from 'papaparse';
import { firstValueFrom } from 'rxjs';

// Derived from the trips data file
export type MartaTrip = {
  route_id: string,
  service_id: string,
  trip_id: string,
  trip_headsign: string,
  trip_short_name: string,
  direction_id: string,
  block_id: string,
  shape_id: string,
  wheelchair_accessible: string,
  bikes_allowed: string,
}

@Injectable({
  providedIn: 'root',
})
export class MartaTripService {
  constructor(private httpClient: HttpClient) {
    this.loadTrips();
  }

  private trips: Map<string, MartaTrip> = new Map();
  private routeToTrips: Map<string, string[]> = new Map();

  private loadingPromise?: Promise<void>;
  private loaded = false;

  // Loads in the trip data from public/assets/static-transit-information/trips.txt
  async loadTrips() {
    if (this.loadingPromise || this.loaded)
      return;

    this.loadingPromise = (async () => {
      // Use the HTTP client to pull the file data from the page
      const file = await firstValueFrom(this.httpClient.get("assets/static-transit-information/trips.txt", { responseType: "text" }));

      // Parse out the data from the file with Papa Parse
      parse(file, {
        header: true,
        skipEmptyLines: true,
        step: (row: { data?: {} }) => { // Called each row that's parsed
          // Map the trip to its respective route id array
          let trip: MartaTrip = <MartaTrip>row.data;

          if (!this.routeToTrips.get(trip.route_id))
            this.routeToTrips.set(trip.route_id, []);

          this.trips.set(trip.trip_id, trip);

          this.routeToTrips.get(trip.route_id)?.push(trip.trip_id);
        },
        complete: () => {
          this.loaded = true;
          console.log("Trips loaded");
        }
      })
    })();

    return this.loadingPromise;
  }

  async getTripFromIdAsync(tripId: string): Promise<MartaTrip | undefined> {
    await this.loadTrips()
    return this.trips.get(tripId);
  }

  getTripFromId(tripId: string): MartaTrip | undefined {
    return this.trips.get(tripId);
  }
}
