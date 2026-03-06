import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { StreetComponent } from "./streets/streets.component";
import { TransitComponent } from './transit/transit.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navigation',
  imports: [RouterOutlet, StreetComponent, TransitComponent],
  templateUrl: './navigation.component.html',
  styleUrl: './navigation.component.css',
})
export class NavigationComponent implements OnInit, OnDestroy {
  constructor(private router: Router) {}

  route?: string;
  routeSubscription?: Subscription;

  ngOnInit(): void {
    // Update the legend selector based on the route already within the URL
    this.routeSubscription = this.router.events.subscribe(() => {
      if (this.router.url.includes("/transit")) {
        this.route = "/transit";
      }
      else {
        this.route = "/street";
      }
    })
  }

  // Redirects the URL to the street or transit routes when they pick a new selection
  onLegendChange(event: any) {
    const selectedUrl = event.target.value;

    if (selectedUrl) {
      this.router.navigate([selectedUrl]);
    }
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }
}