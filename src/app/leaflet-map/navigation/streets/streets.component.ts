import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { MartaStop, MartaStopService } from '../../../services/marta-stop.service';
import { StreetDropdown } from "./street-dropdown/street-dropdown";

@Component({
  selector: 'app-streets',
  imports: [StreetDropdown, RouterLink],
  templateUrl: './streets.component.html',
  styleUrl: './streets.component.css',
})
export class StreetComponent implements OnInit, OnDestroy {
  stops?: Map<string, MartaStop[]> = new Map();  
  selectedStreet?: string;
  selectedStop?: string;
  routerSub?: Subscription;
  stopsLoadedSub?: Subscription;

  @ViewChildren("navItem") items?: QueryList<ElementRef<HTMLDivElement>>;

  constructor(
    private route: ActivatedRoute, 
    private martaStopService: MartaStopService,
    private changeDetectorRef: ChangeDetectorRef) { }

  ngOnInit() {
    this.stopsLoadedSub = this.martaStopService.stopsChanged.subscribe(stops => {
      this.stops = stops;
      this.refreshScroll();
      this.changeDetectorRef.detectChanges();
    })

    this.routerSub = this.route.paramMap.subscribe((params) => {
      this.selectedStreet = params.get("id") ?? undefined;
      this.selectedStop = params.get("stop_id") ?? undefined;

      this.refreshScroll();
      this.changeDetectorRef.detectChanges();
    })
  }

  ngAfterViewInit(): void {
    this.refreshScroll();
  }

  refreshScroll() {
    if (!this.items)
      return

    const itemArray = this.items.toArray();

    // Search through the item array
    for (const item of itemArray) {
      // Get the element's attribute
      const attribute = item.nativeElement.getAttribute("data-stop");

      // Compare the ids
      if (attribute == this.selectedStreet) {
        // If we have a match, scroll it into view
        item.nativeElement.scrollIntoView({ behavior: "auto", block: "start" });
        break;
      }
    }
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.stopsLoadedSub?.unsubscribe();
  }
}