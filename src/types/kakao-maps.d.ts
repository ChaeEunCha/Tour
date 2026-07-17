export {};

declare global {
  namespace kakao.maps {
    class LatLng {
      constructor(lat: number, lng: number);
    }

    class Size {
      constructor(width: number, height: number);
    }

    class MarkerImage {
      constructor(src: string, size: Size);
    }

    class LatLngBounds {
      constructor();
      extend(latlng: LatLng): void;
    }

    class Map {
      constructor(container: HTMLElement, options: { center: LatLng; level: number });
      setBounds(bounds: LatLngBounds): void;
    }

    class Marker {
      constructor(options: {
        map?: Map;
        position: LatLng;
        image?: MarkerImage;
        title?: string;
      });
      setMap(map: Map | null): void;
    }

    class InfoWindow {
      constructor(options: { content: string });
      open(map: Map, marker: Marker): void;
      close(): void;
    }

    namespace event {
      function addListener(target: Marker, type: string, handler: () => void): void;
    }

    function load(callback: () => void): void;
  }

  interface Window {
    kakao: typeof kakao;
  }
}
