import { Routes } from '@angular/router'; 
import { NavigationComponent } from './leaflet-map/navigation/navigation.component';
import { StreetComponent } from './leaflet-map/navigation/streets/streets.component';
import { TransitComponent } from './leaflet-map/navigation/transit/transit.component';

export const routes: Routes = [
    { path: "", redirectTo: "street", pathMatch: "full" },
    { path: "street/:id/:stop_id", component: StreetComponent, runGuardsAndResolvers: "pathParamsChange" },
    { path: "street/:id", component: StreetComponent, runGuardsAndResolvers: "pathParamsChange" },
    { path: "street", component: StreetComponent, runGuardsAndResolvers: "pathParamsChange" },
    { path: "transit", component: TransitComponent, runGuardsAndResolvers: "pathParamsChange" },
    { path: "transit/:vehicle_id", component: TransitComponent, runGuardsAndResolvers: "pathParamsChange" },
];
