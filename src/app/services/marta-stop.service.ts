import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom, Subject } from 'rxjs';
import { parse } from "papaparse";

import type * as LType from 'leaflet';
const L = (window as any).L as typeof LType;

// https://gtfs.org/documentation/schedule/reference/#stopstxt
export enum LocationType {
  stop = 0,
  station = 1,
  entrance_exit = 2,
  generic = 3,
  boarding_area = 4
}

export enum WheelchairBoarding {
  no_info = 0,
  accessible = 1,
  inaccessible = 2
}

// Derived from the stops data file
export type MartaStop = {
  stop_id: string,
  stop_code?: string,
  stop_name: string,
  stop_name_short?: string,
  stop_desc?: string,
  stop_lat: number,
  stop_lon: number,
  zone_id?: string, 
  stop_url?: string,
  location_type?: LocationType,
  parent_station?: string,
  stop_timezone?: string,
  wheelchair_boarding?: WheelchairBoarding
}

@Injectable({
  providedIn: 'root',
})
export class MartaStopService {
  readonly stopsChanged = new BehaviorSubject<Map<string, MartaStop[]>>(new Map())
  private stopMap = new Map<string, MartaStop>();

  private loaded = false;
  private loadingPromise?: Promise<void>;
  
  readonly onStopSelected = new Subject<MartaStop>();
  readonly onStreetSelected = new Subject<string>();

  private _selectedStreet?: string;

  public get selectedStreet(): string | undefined {
    return this._selectedStreet;
  }

  readonly mapIcon = L.divIcon({
    className: "",
    html: '<span class="material-symbols-sharp icon-glpyh-stroke stop">bus_map_pin</span>',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  readonly cluster = (L as any).markerClusterGroup({
    disableClusteringAtZoom: 16,
    maxClusterRadius: 60,
    spiderfyOnMaxZoom: true,
    animate: false
  })

  constructor (private httpClient: HttpClient) {}

  // Loads in the stop data from public/assets/static-transit-information/stops.txt
  async loadStops() {
    if (this.loadingPromise || this.loaded) 
      return;

    this.loadingPromise = ( async () => {
      // Use the HTTP client to pull the file data from the page
      const file = await firstValueFrom(this.httpClient.get("assets/static-transit-information/stops.txt", { responseType: "text" }));

      let stops = new Map<string, MartaStop[]>();

      // Parse out the data from the file with Papa Parse
      parse(file, {
        header: true,
        skipEmptyLines: true,
        step: (row: { data?: {} }) => { // Called each row that's parsed
          // Map the stop to its respective road name in the road map
          let stop: MartaStop = <MartaStop>row.data;

          // stop_name is usually formatted as "street name @ cross street name"
          // No official documentation by GTFS, so it's likely a MARTA standard
          const roadSegments = stop.stop_name.split("@");

          if (roadSegments.length < 2)
            return;

          const roadName = roadSegments[0].trim();
          const stopName = roadSegments[1].trim();

          // Initialize street name array if not already initialized
          if (!stops.get(roadName))
            stops.set(roadName, []);

          // Set the stop's short name to the other street name
          stop.stop_name_short = stopName;

          // Push it to the first street name's array
          stops.get(roadName)?.push(stop);

          // Set it to the stop map, so we can quickly retrieve it by stop id
          this.stopMap.set(stop.stop_id, stop);
        },
        complete: () => {
          this.loaded = true;
          console.log("Stops loaded");
        }
      })

      const sortedStops = [...stops].sort((a, b) => {
        return a[0].localeCompare(b[0]);
      })

      this.stopsChanged.next(new Map(sortedStops));
      this.loaded = true;
    })();

    return this.loadingPromise;
  }

  // Get the current stop map
  async getStops() {
    await this.loadStops();
    return new Map(this.stopsChanged.getValue());
  }

  // Gets a stop by stop id
  async getStop(id: string): Promise<MartaStop | undefined> {
    await this.loadStops();
    return this.stopMap.get(id);
  }

  // Lets other components tell the service that a stop has been selected
  async selectStop(stop: MartaStop) {
    await this.loadStops();

    if (!this.getStop(stop.stop_id))
      return;

    this.onStopSelected.next(stop);
  }

  // Lets other components tell the service that a street has been selected
  async selectStreet(street: string | undefined) {
    await this.loadStops();

    if (!street)
      return
    
    this._selectedStreet = street;
    this.onStreetSelected.next(street);
  }
}
