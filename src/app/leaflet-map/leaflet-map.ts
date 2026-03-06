import { AfterViewInit, ApplicationRef, Component, ComponentRef, createComponent, ElementRef, EnvironmentInjector, OnDestroy, ViewChild } from '@angular/core';
import { MartaLocationService, MartaVehicle } from '../services/marta-location.service';
import { Subscription } from 'rxjs';
import { Float2, SmoothLerpService } from '../services/smooth-lerp.service';
import { MartaStop, MartaStopService } from '../services/marta-stop.service';
import { MartaRouteService } from '../services/marta-route.service';
import { MartaTrip, MartaTripService } from '../services/marta-trip.service';
import { MartaShapePoint, MartaShapeService } from '../services/marta-shape.service';
import { Router } from '@angular/router';
import { MartaStopTimeService } from '../services/marta-stop-time.service';
import { StopPopupComponent } from './stop-popup/stop-popup.component';
import { VehiclePopupComponent } from './vehicle-popup/vehicle-popup.component';

import type * as LType from 'leaflet';
const L = (window as any).L as typeof LType;

@Component({
  selector: 'app-leaflet-map',
  providers: [],
  templateUrl: './leaflet-map.html',
  styleUrl: './leaflet-map.css',
})
export class LeafletMap implements AfterViewInit, OnDestroy {
  private map?: LType.Map;
  private markers: Map<string, LType.Marker> = new Map();
  private stopMarkers: Map<string, LType.Marker> = new Map();
  private polyLines: Map<string, LType.Polyline> = new Map();

  private vehiclePopups: Map<string, ComponentRef<VehiclePopupComponent>> = new Map();
  private stopPopups: Map<string, ComponentRef<StopPopupComponent>> = new Map();

  private stopSelectedSub?: Subscription;
  private stopsLoadedSub?:  Subscription;
  private vehicleSelectedSub?: Subscription;

  private atlCenterMarker = L.marker([33.7501, -84.3885]);

  private transitVehicleUpdate?: Subscription;
  private animationCancelers: Map<LType.Marker, () => void> = new Map();
  private pendingMoveEnd?: () => void;

  @ViewChild("legendSelect") legendSelect?: ElementRef<HTMLSelectElement>;

  constructor(
    private martaService: MartaLocationService, 
    private smoothLerpService: SmoothLerpService,
    private martaStopService: MartaStopService,
    private martaRouteService: MartaRouteService,
    private martaTripService: MartaTripService, 
    private martaShapeService: MartaShapeService,
    private martaStopTimeService: MartaStopTimeService,
    private router: Router,
    private environmentInjector: EnvironmentInjector,
    private applicationRef: ApplicationRef
  ) {}

  ngAfterViewInit() {
    // Init the map after a delay. Needed to ensure that the map fully loads in after all the DOM adjustments have been made
    setTimeout(() => {
      this.initMap();
    }, 1000);

    // Setup our subscriptions after all elements are loaded
    if (!this.stopsLoadedSub) {
      this.stopsLoadedSub = this.martaStopService.stopsChanged.subscribe((stopData) => {

        // Iterate through each of the stops provided by the stop service
        stopData.forEach((stops: MartaStop[]) => {
          stops.forEach((stop) => {
            let existingMarker = this.stopMarkers.get(stop.stop_id);

            // Continue on to the next stop if there's already an entry for it in the markers map
            if (existingMarker)
              return;

            // If we couldn't find a marker, create a new one with information from the stop.
            let stopMarker = L.marker(L.latLng(stop.stop_lat, stop.stop_lon), { icon: this.martaStopService.mapIcon });

            // Add it to the cluster layer. This helps minimize how many stops are 
            // visible at once on the map, especially at further distances
            this.martaStopService.cluster.addLayer(stopMarker);
            this.stopMarkers.set(stop.stop_id, stopMarker);

            stopMarker.on("click", async (e) => {
              if (!this.stopPopups.get(stop.stop_id))
                this.addStopPopup(stop.stop_id);

              const stopPopup = this.stopPopups.get(stop.stop_id);

              // Set both the stop and stopTime data for the component once it's been opened
              await this.martaStopTimeService.getArrivalTimes(stop.stop_id).then(stopTimes => {
                stopPopup?.setInput("stopTimes", stopTimes);
                stopPopup?.setInput("stop", stop);
              });

              // Reroute the URL to the street route and append the first half of the stop's name (street name) and the stop id
              // This allows us to organize by each street the stops are on.
              this.router.navigate(["/street", stop.stop_name.split("@")[0].trim(), stop.stop_id]);
            })
          })
        })
      })
    }

    // Subscription handler for when stops on the nav section are selected
    this.stopSelectedSub = this.martaStopService.onStopSelected.subscribe((stop: MartaStop) => {
      if (!stop)
        return;

      const marker = this.stopMarkers.get(stop.stop_id);

      if (!marker)
        return;

      // Cancel previous fly over if we're trying to pan to a different pin
      if (this.pendingMoveEnd)
      {
        this.map?.off("moveend", this.pendingMoveEnd);
        this.pendingMoveEnd = undefined;
      }

      this.map?.stop();

      // If we were able to find the marker from the stop id, fly over to it and "click" it
      this.map?.flyTo(marker.getLatLng(), 16);

      this.pendingMoveEnd = () => {
        if (!this.map)
          return;

        marker.fire("click");
        marker.openPopup();
      }

      this.map?.once("moveend", this.pendingMoveEnd);
    })

    // Subscription handler for when vehicles on the nav section are selected
    this.vehicleSelectedSub = this.martaService.onVehicleSelected.subscribe((vehicleId: string | undefined) => {
      if (!vehicleId)
        return;

      const marker = this.markers.get(vehicleId);

      if (!marker)
        return;

      // Cancel previous fly over if we're trying to pan to a different pin
      if (this.pendingMoveEnd) {
        this.map?.off("moveend", this.pendingMoveEnd);
        this.pendingMoveEnd = undefined;
      }

      this.map?.stop();

      // If we were able to find the marker from the vehicle id, fly over to it and "click" it
      this.map?.flyTo(marker.getLatLng(), 16);

      this.pendingMoveEnd = () => {
        if (!this.map)
          return;

        marker.fire("click");
        marker.openPopup();
      }

      this.map?.once("moveend", this.pendingMoveEnd);
    })

    // Load the stops and start polling for real time vehicle data
    this.martaStopService.loadStops();
    this.startPolling();
  }

  initMap() {
    // Initialize the map with tiles provided by openstreetmap
    const baseMapURl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    this.map = L.map('map');

    // Add the tiles to the map
    L.tileLayer(baseMapURl, {
      crossOrigin: true,
    }).addTo(this.map);

    // Add the stop cluster to the map
    this.map.addLayer(this.martaStopService.cluster);

    // Move the map over Atlanta
    this.map.setView(this.atlCenterMarker.getLatLng(), 15);

    // Let leaflet know that we've "changed" the map size on the DOM
    this.map.invalidateSize();
  }

  // Connects the feed message observable to the vehicle update subscription and tells the location service to start polling
  startPolling() {
    this.transitVehicleUpdate = this.martaService.feedMessageUpdated.subscribe((message) => {
      // Refresh the map
      this.map?.invalidateSize();

      // Check if we have a valid entity provided by the feed message
      if (!this.map || !message?.entity)
        return;

      // Iterate through the vehicle data provided by the entity
      message.entity.forEach(async (vehicleData: MartaVehicle) => {
        let latitude = vehicleData.vehicle?.position?.latitude;
        let longitude = vehicleData.vehicle?.position?.longitude;
        let vehiclePosition = vehicleData.vehicle?.position;

        // Confirm that we've got the data we need
        if (vehicleData.id === undefined || vehiclePosition === undefined || latitude === undefined || longitude === undefined) return;
        
        // Get the coordinate object from the lat and lon in the vehicle position data
        let position = L.latLng(latitude, longitude);

        // Ensure the vehicle data also provides a route id
        if (!vehicleData.vehicle?.trip?.routeId)
          return;

        // Does a marker entry for the vehicle already exist?
        if (!this.markers.has(vehicleData.id)) {
          // If not, create one
          this.markers.set(vehicleData.id, L.marker(position, { icon: this.martaService.mapIcon, zIndexOffset: 100 }));
          const vehicleMarker = this.markers.get(vehicleData.id)!;

          // Add the marker directly to the map. Vehicle markers aren't clustered like stop markers are
          vehicleMarker.addTo(this.map!);

          // Click event for the marker
          vehicleMarker.on("click", async () => {
            // Since this scope will be executed later, we need to confirm that the route id and vehicle data still exist
            const routeId = vehicleData.vehicle?.trip?.routeId;
            const vehicleId = vehicleData.id
            const tripId = vehicleData.vehicle?.trip?.tripId;

            if (!routeId || !vehicleId || !tripId)
              return;

            // If we haven't already created a popup component for the marker, create it here
            if (vehicleData.id && !this.vehiclePopups.get(vehicleData.id))
              await this.addVehiclePopup(vehicleData.id)

            // Get and set the vehicle and route inputs for the component
            const route = await this.martaRouteService.getRouteFromShortId(routeId);
            const vehicleComponent = this.vehiclePopups.get(vehicleData.id ?? "");

            vehicleComponent?.setInput("vehicle", vehicleData);
            vehicleComponent?.setInput("route", route);

            // Navigate to the transit route and provide the vehicle id so we can show the correctly selected one
            this.router.navigate(["/transit", vehicleData.id]);

            // Now we're loading in the poly lines for the selected route
            const trip: MartaTrip | undefined = this.martaTripService.getTripFromId(tripId);

            // If we're unable to find a trip, return early
            if (!trip)
              return;

            // A "shape point" just holds coordinate data for points on the map
            const shapes: MartaShapePoint[] | undefined = await this.martaShapeService.getShapePointsFromId(trip.shape_id);

            // If we can't find any shapes, return early
            if (!shapes)
              return;

            // Clear out any previously added polylines from the map
            for (const polyline of this.polyLines.values()) {
              polyline.removeFrom(this.map!);
            }

            this.polyLines.clear();

            let polyLinePoints: Float2[] = []

            // Map the shape points to valid polyline points
            shapes.map((shape) => {
              polyLinePoints.push([shape.shape_pt_lat, shape.shape_pt_lon]);
            })

            // Create the polyline from the points and add it to the map
            this.polyLines.set(trip.shape_id, L.polyline(polyLinePoints));
            this.polyLines.get(trip.shape_id)?.addTo(this.map!);
          })
        }
        else {
          // If we already have a marker for the vehicle, update the marker's position based off the real time data
          let marker = this.markers.get(vehicleData.id)!;

          // Get the current coords so we can see if it's out of the map bounds
          let coords = marker.getLatLng()

          // If the current or next coords for the vehicle are out of the map's bounds, snap it into place
          if (!this.map || !this.map.getBounds().contains(coords) && !this.map.getBounds().contains(position)) {
            marker.setLatLng(position);
          }
          else {
            // Otherwise, smoothly interpolate the marker over to the new position
            if (this.animationCancelers.has(marker))
            {
              this.animationCancelers.get(marker)!();
              this.animationCancelers.delete(marker);
            }

            const goal = [latitude, longitude] as Float2;
            const cancel = this.smoothLerpService.animateFloat2([coords.lat, coords.lng], goal, 2.5, (newFrame: Float2) => {
              if (!this.map) {
                if (this.animationCancelers.has(marker))
                  this.animationCancelers.delete(marker);
                return;
              }

              marker.setLatLng(L.latLng(newFrame));

              if (newFrame == goal)
                this.animationCancelers.delete(marker);
            })

            this.animationCancelers.set(marker, cancel);
          }
        }
      });
    })

    // Tells the location service to start polling.
    this.martaService.startPolling();
  }

  // Creates an angular component for vehicle marker popups
  addVehiclePopup(vehicleId: string) {
    const vehicleMarker = this.markers.get(vehicleId);

    // If the marker isn't valid or if we've already assigned a component, return early
    if (!vehicleMarker || this.vehiclePopups.get(vehicleId))
      return;

    // Create the component and attach it to Angular's working tree
    const popupComponentRef = createComponent(VehiclePopupComponent, {
      environmentInjector: this.environmentInjector
    });

    this.applicationRef.attachView(popupComponentRef.hostView);

    // Get the native element and bind it to the marker
    const domElement = popupComponentRef.location.nativeElement;
    vehicleMarker.bindPopup(domElement).openPopup();

    // Add the component to the vehicle component ref map
    this.vehiclePopups.set(vehicleId, popupComponentRef);
  }

  // Creates an angular component for stop marker popups
  async addStopPopup(stopId: string) {
    const stopMarker = this.stopMarkers.get(stopId);

    // If the marker isn't valid or if we've already assigned a component, return early
    if (!stopMarker || this.stopPopups.get(stopId))
      return;

    // Create the component and attach it to Angular's working tree
    const popupComponentRef = createComponent(StopPopupComponent, {
      environmentInjector: this.environmentInjector
    });

    this.applicationRef.attachView(popupComponentRef.hostView);

    // Get the native element and bind it to the marker
    const domElement = popupComponentRef.location.nativeElement;
    stopMarker.bindPopup(domElement).openPopup();

    // Add the component to the stop component ref map
    this.stopPopups.set(stopId, popupComponentRef)
  }

  // Cleans up all subscriptions when the component is removed from the DOM
  ngOnDestroy(): void {
    // Close all markers before we tear the map down
    this.markers.forEach(m => m.closePopup());
    this.stopMarkers.forEach(m => m.closePopup());

    // Create a reference to the original map and set the original reference to undefined
    const mapRef = this.map;
    this.map = undefined;

    // Teardown any attached event handlers, stop the map, and remove it
    mapRef?.off("moveend");
    mapRef?.stop();
    mapRef?.remove();

    // Cancel any active transit vehicle animations
    this.animationCancelers.forEach(cancel => cancel());
    this.animationCancelers.clear();

    // Unsubscribe from our services
    this.transitVehicleUpdate?.unsubscribe();
    this.martaService.stopPolling();
    this.stopSelectedSub?.unsubscribe();
    this.stopsLoadedSub?.unsubscribe();
    this.vehicleSelectedSub?.unsubscribe();
  }
}
