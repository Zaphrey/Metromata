import { HttpClient } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import { parse } from 'papaparse';
import { firstValueFrom } from 'rxjs';

// Derived from the route data file
export type MartaRoute = {
  route_id: string,
  agency_id: string,
  route_short_name: string,
  route_long_name: string,
  route_desc: string,
  route_type: string,
  route_url: string,
  route_color: string,
  route_text_color: string,
}

@Injectable({
  providedIn: 'root',
})
export class MartaRouteService implements OnDestroy {
  private routes: Map<string, MartaRoute> = new Map();
  private routeShortMap: Map<string, string> = new Map();

  private loadingPromise?: Promise<void>;
  private loaded = false;

  constructor(private httpClient: HttpClient) {
    this.loadRoutes();
  }

  // Loads in the route data from public/assets/static-transit-information/routes.txt
  async loadRoutes() {
    if (this.loadingPromise || this.loaded)
      return;

    this.loadingPromise = (async () => {
      // Use the HTTP client to pull the file data from the page
      const file = await firstValueFrom(this.httpClient.get("assets/static-transit-information/routes.txt", { responseType: "text" }));

      // Parse out the data from the file with Papa Parse
      parse(file, {
        header: true,
        skipEmptyLines: true,
        step: (row: { data?: {} }) => { // Called each row that's parsed
          // Maps the shape to the route and routeShortMap maps by route id and route short name respectively
          let route: MartaRoute = <MartaRoute>row.data;
          this.routes.set(route.route_id, route);
          this.routeShortMap.set(route.route_short_name, route.route_id);
        },
        complete: () => {
          this.loaded = true;
          console.log("Routes loaded");
        }
      })
    })();

    return true;
  }

  async getRouteFromShortId(shortId: string): Promise<MartaRoute | undefined> {
    await this.loadRoutes();
    const shortIdValue = this.routeShortMap.get(shortId);

    if (!shortIdValue)
      return;

    return this.routes.get(shortIdValue);
  }

  async getRoute(routeId: string): Promise<MartaRoute | undefined> {
    await this.loadRoutes();
    return this.routes.get(routeId);
  }

  ngOnDestroy(): void {
    
  }

}
