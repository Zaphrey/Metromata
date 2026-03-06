import { Pipe, PipeTransform } from '@angular/core';

// https://gtfs.org/documentation/realtime/feed-entities/vehicle-positions/#occupancystatus

@Pipe({
  name: 'occupancyStatus',
})
export class OccupancyStatusPipe implements PipeTransform {
  private statuses: string[] = [
    "Empty",
    "Many seats available",
    "Few seats available",
    "Standing room only",
    "Crushed standing room only",
    "Full",
    "Not accepting passengers",
  ];
  
  // Transforms input numbers into a GTFS vehicle occupancy status string
  transform(value: number): string {
    return value < this.statuses.length && value >= 0 ? this.statuses[value] :"Unknown occupancy status"
  }
}
