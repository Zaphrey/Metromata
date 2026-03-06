import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { parse } from 'papaparse';
import { firstValueFrom } from 'rxjs';

// Derived from the shapes data file
export type MartaShapePoint = {
  shape_id: string,
  shape_pt_lat: number,
  shape_pt_lon: number,
  shape_pt_sequence: number,
  shape_dist_traveled: number,
}

@Injectable({
  providedIn: 'root',
})
export class MartaShapeService {
  private shapes: Map<string, MartaShapePoint[]> = new Map();
  private loadingPromise?: Promise<void>;
  private loaded = false;

  constructor(private httpClient: HttpClient) {
    this.loadShapes();
  }

  // Loads in the shape data from public/assets/static-transit-information/shapes.txt
  async loadShapes() {
    if (this.loadingPromise || this.loaded)
      return;

    this.loadingPromise = (async () => {
      // Use the HTTP client to pull the file data from the page
      const file = await firstValueFrom(this.httpClient.get("assets/static-transit-information/shapes.txt", { responseType: "text" }));

      // Parse out the data from the file with Papa Parse
      parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        step: (row: { data?: {} }) => { // Called each row that's parsed
          // Map the shape to its respective shape id map array
          let shape: MartaShapePoint = <MartaShapePoint>row.data;

          shape.shape_id = shape.shape_id.toString();

          if (!this.shapes.get(shape.shape_id))
            this.shapes.set(shape.shape_id, []);

          this.shapes.get(shape.shape_id)?.push(shape);
        },
        complete: () => {
          this.loaded = true;
          console.log("Shapes loaded");
        }
      })
    })();

    return this.loadingPromise;
  }

  async getShapePointsFromId(shapeId: string): Promise<MartaShapePoint[] | undefined> {
    await this.loadShapes();

    return this.shapes.get(shapeId)?.slice();
  }
}
