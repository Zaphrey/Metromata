import { ChangeDetectorRef, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { MartaStopTime } from '../../services/marta-stop-time.service';
import { MartaStop } from '../../services/marta-stop.service';
import { MartaTripService } from '../../services/marta-trip.service';
import { MartaRoute, MartaRouteService } from '../../services/marta-route.service';

@Component({
  selector: 'app-stop-popup',
  templateUrl: './stop-popup.component.html',
  styleUrl: './stop-popup.component.css',
})
export class StopPopupComponent implements OnChanges {
  routes: (MartaStopTime & { route: MartaRoute })[] = [];

  @Input() stopTimes?: MartaStopTime[];
  @Input() stop?: MartaStop;

  constructor(
    private martaTripService: MartaTripService,
    private martaRouteService: MartaRouteService,
    private changeDetectorRef: ChangeDetectorRef,
  ) {}

  async ngOnChanges(changes: SimpleChanges) {
    if (!this.stopTimes) 
      return;

    this.routes = []

    // If any changes are made, append the routes for each stopTime inside of them for easier HTML access
    for (const stopTime of this.stopTimes) {
      let trip = await this.martaTripService.getTripFromId(stopTime.trip_id.trim());

      // If we couldn't find any trips, return early
      if (!trip)
        continue;

      const route = await this.martaRouteService.getRoute(trip.route_id);

      // If we couldn't find any routes from the trip, return early
      if (!route)
        continue;

      // Create a new object by spreading the stopTime object into a blank one, and append the route at the end
      this.routes.push({ ...stopTime, route: route });
    }

    // Tell Angular that we've made some changes
    this.changeDetectorRef.markForCheck();
  }
}
