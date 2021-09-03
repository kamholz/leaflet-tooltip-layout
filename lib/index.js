(function (factory, window) {
  if (typeof define === 'function' && define.amd) {
    define(['leaflet'], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(require('leaflet'));
  }
  if (typeof window !== 'undefined' && window.L) {
    window.L.tooltipLayout = factory(L);
  }
})((L) => {
  const TooltipLayout = {};

  // global variables
  let map;
  let markerList = []; // all markers here
  let polylineList = []; // all polylines here

  // events
  let _onPolylineCreated = null; // will be called after polyline has been created

  function initialize(leafletMap, onPolylineCreated) {
    map = leafletMap;
    polylineList = [];

    //default style
    if (onPolylineCreated) {
      _onPolylineCreated = onPolylineCreated;
    } else {
      _onPolylineCreated = (ply) => {
        ply.setStyle({
          color: '#90A4AE',
        });
      };
    }

    redrawLines(true);

    // event registrations
    map.on('zoomstart', () => {
      removeAllPolyline(map);
    });

    map.on('zoomend', () => {
      redrawLines(true);
    });

    map.on('dragend', () => {
      redrawLines();
    });

    map.on('resize', () => {
      redrawLines();
    });
  }

  function redrawLines(maintainAllPolyline) {
    if (!maintainAllPolyline) {
      removeAllPolyline(map);
    }
    setRandomPos(map);
    layoutByForce();
    setEdgePosition();
    drawLine(map);
  }

  function addMarker(marker) {
    markerList.push(marker);
  }

  function deleteMarker(marker) {
    const i = markerList.indexOf(marker);
    if (i !== -1) {
      markerList.splice(i, 1);
    }
  }

  function resetMarker(marker) {
    const name = marker.getTooltip().getContent();
    const { options } = marker.getTooltip();
    marker.unbindTooltip();

    marker.bindTooltip(name, {
      pane: options.pane,
      offset: options.offset,
      className: options.className,
      permanent: true,
      interactive: true,
      direction: 'left',
      sticky: 'none',
      opacity: options.opacity,
    });
    markerList.push(marker);
  }

  function getMarkers() {
    return markerList;
  }

  function setMarkers(arr) {
    markerList = arr;
  }

  function getLine(marker) {
    return marker.__ply;
  }

  function removeAllPolyline(map) {
    let i;
    for (i = 0; i < polylineList.length; i++) {
      map.removeLayer(polylineList[i]);
    }
    polylineList = [];
  }

  /**
   * Draw lines between markers and tooltips
   * @param map leaflet map
   */
  function drawLine(map) {
    removeAllPolyline(map);
    for (let i = 0; i < markerList.length; i++) {
      const marker = markerList[i];
      const markerDom = marker._icon;
      const markerPosition = getPosition(markerDom);
      const label = marker.getTooltip();

      const labelDom = label._container;
      const labelPosition = getPosition(labelDom);

      let x1 = labelPosition.x;
      let y1 = labelPosition.y;

      const { x, y } = markerPosition;

      x1 -= 5;
      y1 += 2;
      if (x1 - x !== 0 || y1 - y !== 0) {
        if (x1 + labelDom.offsetWidth < markerPosition.x) {
          x1 += labelDom.offsetWidth;
        }
        if (y1 + labelDom.offsetHeight < markerPosition.y) {
          y1 += labelDom.offsetHeight;
        }
        const lineDest = L.point(x1, y1);
        const destLatLng = map.layerPointToLatLng(lineDest);

        setTimeout(
          ((marker, destLatLng) => () => {
            const ply = L.polyline([marker.getLatLng(), destLatLng]);
            _onPolylineCreated && _onPolylineCreated(ply);
            marker.__ply = ply;
            polylineList.push(ply);
            ply.addTo(map);
          })(marker, destLatLng),
          0
        );
      }
    }
  }

  function setRandomPos() {
    for (let i = 0; i < markerList.length; i++) {
      const marker = markerList[i];
      const label = marker.getTooltip();
      const labelDom = label._container;
      const markerDom = marker._icon;
      const markerPosition = getPosition(markerDom);
      // var angle = Math.floor(Math.random() * 19 + 1) * 2 * Math.PI / 20;
      const angle = ((2 * Math.PI) / 6) * i;
      const { x, y } = markerPosition;
      const dest = L.point(
        Math.ceil(x + (50 * Math.sin(angle))),
        Math.ceil(y + (50 * Math.cos(angle)))
      );
      L.DomUtil.setPosition(labelDom, dest);
    }
  }

  function scaleTo(a, b) {
    return L.point(a.x * b.x, a.y * b.y);
  }

  function normalize(a) {
    const l = a.distanceTo(L.point(0, 0));
    if (l === 0) {
      return a;
    }
    return L.point(a.x / l, a.y / l);
  }

  function fa(x, k) {
    return (x * x) / k;
  }

  function fr(x, k) {
    return (k * k) / x;
  }

  /**
   * get position form el.style.transform
   */
  function getPosition(el) {
    const translateString = el.style.transform
      .split('(')[1]
      .split(')')[0]
      .split(',');
    return L.point(parseInt(translateString[0]), parseInt(translateString[1]));
  }

  /**
   * t is the temperature in the system
   */
  function computePositionStep(t) {
    const area = (window.innerWidth * window.innerHeight) / 10;
    const k = Math.sqrt(area / markerList.length);
    let dpos = L.point(0, 0);
    let v_pos;
    let v;
    let i;

    for (i = 0; i < markerList.length; i++) {
      v = markerList[i];
      // get position of label v
      v.disp = L.point(0, 0);
      v_pos = getPosition(v.getTooltip()._container);

      // compute gravitational force
      for (let j = 0; j < markerList.length; j++) {
        const u = markerList[j];
        if (i !== j) {
          const u_pos = getPosition(u.getTooltip()._container);
          dpos = v_pos.subtract(u_pos);
          if (dpos !== 0) {
            v.disp = v.disp.add(
              normalize(dpos).multiplyBy(fr(dpos.distanceTo(L.point(0, 0)), k))
            );
          }
        }
      }
    }

    // compute force between marker and tooltip
    for (i = 0; i < markerList.length; i++) {
      v = markerList[i];
      v_pos = getPosition(v.getTooltip()._container);
      dpos = v_pos.subtract(getPosition(v._icon));
      v.disp = v.disp.subtract(
        normalize(dpos).multiplyBy(fa(dpos.distanceTo(L.point(0, 0)), k))
      );
    }

    // calculate layout
    for (i = 0; i < markerList.length; i++) {
      const { disp } = markerList[i];
      let p = getPosition(markerList[i].getTooltip()._container);
      const d = scaleTo(
        normalize(disp),
        L.point(Math.min(Math.abs(disp.x), t), Math.min(Math.abs(disp.y), t))
      );
      p = p.add(d);
      p = L.point(Math.ceil(p.x), Math.ceil(p.y));
      L.DomUtil.setTransform(markerList[i].getTooltip()._container, p);
    }
  }

  function layoutByForce() {
    const start = Math.ceil(window.innerWidth / 10);
    const times = 50;
    let t;
    for (let i = 0; i < times; i += 1) {
      t = start * (1 - (i / (times - 1)));
      computePositionStep(t);
    }

    for (let i = 0; i < markerList.length; i++) {
      let p = getPosition(markerList[i].getTooltip()._container);
      const width = markerList[i].getTooltip()._container.offsetWidth;
      const height = markerList[i].getTooltip()._container.offsetHeight;
      p = L.point(Math.ceil(p.x - (width / 2)), Math.ceil(p.y - (height / 2)));
      L.DomUtil.setTransform(markerList[i].getTooltip()._container, p);
    }
  }

  function setEdgePosition() {
    const bounds = map.getBounds();
    const northWest = map.latLngToLayerPoint(bounds.getNorthWest());
    const southEast = map.latLngToLayerPoint(bounds.getSouthEast());

    for (let i = 0; i < markerList.length; i++) {
      const tooltip = getPosition(markerList[i].getTooltip()._container);
      const marker = getPosition(markerList[i]._icon);
      const width = markerList[i].getTooltip()._container.offsetWidth;
      const height = markerList[i].getTooltip()._container.offsetHeight;

      let isEdge = false;
      if (marker.x > northWest.x && tooltip.x < northWest.x) {
        tooltip.x = northWest.x;
        isEdge = true;
      } else if (marker.x < southEast.x && tooltip.x > southEast.x - width) {
        tooltip.x = southEast.x - width;
        isEdge = true;
      }

      if (marker.y > northWest.y && tooltip.y < northWest.y) {
        tooltip.y = northWest.y;
        isEdge = true;
      } else if (marker.y < southEast.y && tooltip.y > southEast.y - height) {
        tooltip.y = southEast.y - height;
        isEdge = true;
      }

      if (!isEdge) {
        if (marker.x < northWest.x && tooltip.x > northWest.x - width) {
          tooltip.x = northWest.x - width;
        } else if (marker.x > southEast.x && tooltip.x < southEast.x) {
          tooltip.x = southEast.x;
        }

        if (marker.y < northWest.y && tooltip.y > northWest.y - height) {
          tooltip.y = northWest.y - height;
        } else if (marker.y > southEast.y && tooltip.y < southEast.y) {
          tooltip.y = southEast.y;
        }
      }

      L.DomUtil.setTransform(markerList[i].getTooltip()._container, tooltip);
    }
  }

  TooltipLayout['initialize'] = initialize;
  TooltipLayout['redrawLines'] = redrawLines;
  TooltipLayout['resetMarker'] = resetMarker;
  TooltipLayout['getMarkers'] = getMarkers;
  TooltipLayout['setMarkers'] = setMarkers;
  TooltipLayout['addMarker'] = addMarker;
  TooltipLayout['deleteMarker'] = deleteMarker;
  TooltipLayout['getLine'] = getLine;
  TooltipLayout['removeAllPolyline'] = removeAllPolyline;

  return TooltipLayout;
}, window);
