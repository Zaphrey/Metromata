import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, NgZone, OnDestroy, OnInit, QueryList, ViewChildren } from '@angular/core';
import { MartaLocationService, MartaVehicle } from '../../../services/marta-location.service';
import { Subscription } from 'rxjs';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MartaRouteService } from '../../../services/marta-route.service';

@Component({
  selector: 'app-transit.component',
  imports: [RouterLink],
  templateUrl: './transit.component.html',
  styleUrl: './transit.component.css',
})
export class TransitComponent implements OnInit, OnDestroy, AfterViewInit {
  private feedMessageUpdated?: Subscription;
  private routeChangedSub?: Subscription;

  // Holds a reference to all of the children in the side bar
  // This allows us to scroll to the selected vehicle, if one is selected
  @ViewChildren("navItem") items?: QueryList<ElementRef<HTMLDivElement>>;

  private _selectedVehicle?: string;
  private _vehicles: (MartaVehicle & { route_name: string })[] = [];

  public get selectedVehicle(): string | undefined {
    return this._selectedVehicle;
  }

  public get vehicles(): (MartaVehicle & { route_name: string })[] | undefined {
    return this._vehicles;
  }

  constructor(
    private martaLocationService: MartaLocationService, 
    private martaRouteService: MartaRouteService,
    private route: ActivatedRoute,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Listen for any changes in the bus feed. Keeps us up to date with active vehicles
    this.feedMessageUpdated = this.martaLocationService.feedMessageUpdated.subscribe(this.feedUpdated.bind(this));
    
    // Listen for changes in the URL parameters
    this.routeChangedSub = this.route.params.subscribe((params) => {
      this._selectedVehicle = params["vehicle_id"] ?? undefined;
      
      this.refreshScroll();
      this.changeDetectorRef.detectChanges();
    })
  }

  // "Refresh" the scroll progress to find any selected elements on the page when parameters change
  ngAfterViewInit(): void {
    this.refreshScroll();
  }

  async feedUpdated(message: any) {
    const updatedVehicles: (MartaVehicle & { route_name: string })[] = [];

    if (!message || !message.entity)
      return;

    // Push all vehicles provided by the feed to the new array
    for await (const vehicleData of message.entity as MartaVehicle[]) {
      // If we don't have a valid vehicle, continue to the next iteration
      if (!vehicleData)
        continue;

      const route = await this.martaRouteService.getRouteFromShortId(vehicleData.vehicle?.trip?.routeId ?? "");
      
      // Again, if we don't have a valid route, continue to the next iteration
      if (!route)
        continue;

      // Add the vehicle with the route attached to it to the updated vehicles array 
      updatedVehicles.push({ ...vehicleData, route_name: route.route_long_name});
    }

    // Sort the vehicles by name
    updatedVehicles.sort((a, b) => {
      return a.route_name.localeCompare(b.route_name);
    })

    // Set the vehicle array to the new one
    this._vehicles = updatedVehicles;
    this.changeDetectorRef.detectChanges();
  }

  selectVehicle(vehicleId: string) {
    // Let the location service know that we selected a vehicle in the side bar
    this.martaLocationService.selectVehicle(vehicleId);
  }

  // Searches for any items in the array that contain a "data-stop" 
  // attribute that matches the selected vehicle's id
  refreshScroll() {
    if (!this.items)
      return

    const itemArray = this.items.toArray();

    // Search through the item array
    for (const item of itemArray) {
      // Get the element's attribute
      const attribute = item.nativeElement.getAttribute("data-stop");

      // Compare the ids
      if (attribute == this.selectedVehicle) {
        // If we have a match, scroll it into view
        item.nativeElement.scrollIntoView({ behavior: "auto", block: "start" });
        break;
      }
    }
  }

  ngOnDestroy(): void {
    // Disconnect our subscriptions
    this.feedMessageUpdated?.unsubscribe();
    this.routeChangedSub?.unsubscribe();
  }
}
