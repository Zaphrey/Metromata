import * as L from 'leaflet';

declare global {
    const L: typeof import('leaflet') & {
        markerClusterGroup: (options?: any) => any;
        MarkerClusterGroup: any;
    }
}