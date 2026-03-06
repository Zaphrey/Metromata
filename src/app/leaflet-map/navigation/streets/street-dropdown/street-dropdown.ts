import { ChangeDetectionStrategy, Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { MartaStop, MartaStopService } from '../../../../services/marta-stop.service';

@Component({
  selector: 'app-street-dropdown',
  imports: [RouterLink],
  templateUrl: './street-dropdown.html',
  styleUrl: './street-dropdown.css',
})
export class StreetDropdown implements OnInit {
  @Input() streetName?: string;
  @Input() activeStreet?: string;
  @Input() activeStop?: string;
  @Input() stops?: MartaStop[];

  routerSub?: Subscription;

  constructor(private martaStopService: MartaStopService, private router: Router) {}

  ngOnInit(): void {
    if (!this.stops)
      return;

    this.stops = [...this.stops].sort((a, b) => {
      if (!a.stop_name_short || !b.stop_name_short)
        return 0;

      return a.stop_name_short.localeCompare(b.stop_name_short);
    })
  }

  onStopSelected(stop: MartaStop) {
    this.martaStopService.selectStop(stop);
  }

  onDropdownClicked() {
    if (this.activeStreet == this.streetName)
    {
      this.router.navigate(["/street"]);
    }
  }
}
