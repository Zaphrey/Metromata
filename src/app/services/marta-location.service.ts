import { HttpClient } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import * as protobuf from "protobufjs";
import { BehaviorSubject, firstValueFrom, interval, Observable, Subject, Subscription, TimeInterval } from 'rxjs';

import type * as LType from 'leaflet';
const L = (window as any).L as typeof LType;

// Derived from logging the vehicle data from the marta proto buffer file
export type MartaVehicle = {
  id?: string;
  vehicle?: {
    multiCarriageDetails?: any[];
    occupancyStatus?: number;
    position?: {
      latitude: number,
      longitude: number,
      bearing: number,
    };
    trip?: {
      directionId: number,
      routeId: string,
      startDate: string,
      tripId: string,
    };
    vehicle?: {
      id: string,
      label: string
    }
  }
}

@Injectable({
  providedIn: 'root',
})
export class MartaLocationService implements OnDestroy {
  private root?: protobuf.Root;
  private feedMessage?: any;
  private pollSubscription?: Subscription;
  private pollInterval?: Observable<number>;

  readonly feedMessageUpdated: BehaviorSubject<any> = new BehaviorSubject<any>(undefined);
  readonly onVehicleSelected: BehaviorSubject<string | undefined> = new BehaviorSubject<string | undefined>(undefined);

  // Icon for the map marker
  readonly mapIcon: LType.DivIcon = L.divIcon({
    className: "",
    html: '<span class="material-symbols-sharp icon-glpyh-stroke bus">directions_bus</span>',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
  
  constructor(private httpClient: HttpClient) {}

  private async sendVehiclePositionUpdate()
  {
    if (!this.root) {
      this.root = await protobuf.load("assets/gtfs-realtime.proto");
      this.feedMessage = this.root.lookupType("transit_realtime.FeedMessage");
    }

    // For fetching real time vehicle data, we need to perform a request through a server that allows us to bypass CORS.
    // Since we're running this off of GitHub pages, we can't utilize something like that.
    // However, CloudFlare offers a service that allows us to build workers for simple server tasks.
    // Through the worker, we can bypass CORS by allowing any endpoint to request and receive the data.
    // The specific code for the worker here looks like this:

    /*
      export default {
        async fetch(request, env, ctx) {
          const response = await fetch("https://gtfs-rt.itsmarta.com/TMGTFSRealTimeWebService/vehicle/vehiclepositions.pb");

          return new Response(response.body, {
            headers: {
              "Content-Type": "application/octet-stream",
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET",
              "Access-Control-Allow-Headers": "*"
            }
          });
        }
      };
    */

    try {
      // From there, we just send a get request to the worker's url and receive a response back just fine
      // without needing to deal with CORS
      const buffer = await firstValueFrom(this.httpClient.get("https://white-dew-8449.zachary-humphreys32.workers.dev/", {
        responseType: "arraybuffer",
      }))

      // Decodes the buffer into a valid feed message
      const decodedMessage = this.feedMessage.decode(new Uint8Array(buffer));


      this.feedMessageUpdated?.next(decodedMessage);
    } catch (error) {
      console.log(error);
    }
  }

  async startPolling() {
    await this.sendVehiclePositionUpdate();

    this.pollInterval = interval(5000);

    this.pollSubscription = this.pollInterval.subscribe(async () => {
      await this.sendVehiclePositionUpdate();
    })

    // Send initial postitions once polling has started
    await this.sendVehiclePositionUpdate();
  }

  stopPolling(): void {
    this.pollSubscription?.unsubscribe();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  selectVehicle(vehicleId: string) {
    this.onVehicleSelected.next(vehicleId);
  }
}
