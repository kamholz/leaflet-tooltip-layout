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
  let lineLength = 3; // 1 to 5

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
    const tooltip = marker.getTooltip();
    const name = tooltip.getContent();
    const { options } = tooltip;
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
    for (const polyline of polylineList) {
      map.removeLayer(polyline);
    }
    polylineList = [];
  }

  /**
   * Draw lines between markers and tooltips
   * @param map leaflet map
   */
  const xOffset = -5;
  const yOffset = 0;
  function drawLine(map) {
    removeAllPolyline(map);
    for (const marker of markerList) {
      const markerDom = marker._icon;
      const markerPosition = getPosition(markerDom);

      const labelDom = marker.getTooltip()._container;
      const labelPosition = getPosition(labelDom);

      let x1 = labelPosition.x;
      let y1 = labelPosition.y;

      const { x, y } = markerPosition;

      if (x1 - x !== 0 || y1 - y !== 0) {
        x1 += xOffset;
        y1 += yOffset;

        if (x1 + labelDom.offsetWidth < x) {
          x1 += labelDom.offsetWidth;
        }
        if (y1 + labelDom.offsetHeight < y) {
          y1 += labelDom.offsetHeight;
        }

        const yLen = Math.abs(y - y1);
        const xLen = Math.abs(x - x1);
        if (xLen > yLen) {
          if (Math.atan2(yLen, xLen) < Math.PI / 4) {
            if (x > labelPosition.x + xOffset && x < labelPosition.x + xOffset + labelDom.offsetWidth) {
              x1 = labelPosition.x + xOffset + labelDom.offsetWidth / 2;
            } else {
              y1 = labelPosition.y + yOffset + labelDom.offsetHeight / 2;
            }
          }
        } else if (Math.atan2(xLen, yLen) < Math.PI / 4) {
            if (y > labelPosition.y + yOffset && y < labelPosition.y + yOffset + labelDom.offsetHeight) {
              y1 = labelPosition.y + yOffset + labelDom.offsetHeight / 2;
            } else {
              x1 = labelPosition.x + xOffset + labelDom.offsetWidth / 2;
            }
          }
        }

        const destLatLng = map.layerPointToLatLng(L.point(x1, y1));

        setTimeout(
          ((marker, destLatLng) => () => {
            const ply = L.polyline([marker.getLatLng(), destLatLng]);
            _onPolylineCreated?.(ply);
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
    for (const [i, marker] of markerList.entries()) {
      const labelDom = marker.getTooltip()._container;
      const markerDom = marker._icon;
      const markerPosition = getPosition(markerDom);
      // const angle = Math.floor(Math.random() * 19 + 1) * 2 * Math.PI / 20;
      const angle = ((2 * Math.PI) / 6) * i;
      const dest = L.point(
        Math.ceil(markerPosition.x + (50 * Math.sin(angle))),
        Math.ceil(markerPosition.y + (50 * Math.cos(angle)))
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
    const area = (map._container.offsetWidth * map._container.offsetHeight) / getLineLengthDivisor();
    const k = Math.sqrt(area / markerList.length);

    for (const v of markerList) {
      // get position of label v
      v.disp = L.point(0, 0);
      const v_pos = getPosition(v.getTooltip()._container);

      // compute gravitational force
      for (const u of markerList) {
        if (v !== u) {
          const u_pos = getPosition(u.getTooltip()._container);
          const dpos = v_pos.subtract(u_pos);
          if (dpos !== 0) {
            v.disp = v.disp.add(
              normalize(dpos).multiplyBy(fr(dpos.distanceTo(L.point(0, 0)), k))
            );
          }
        }
      }
    }

    // compute force between marker and tooltip
    for (const v of markerList) {
      const v_pos = getPosition(v.getTooltip()._container);
      const dpos = v_pos.subtract(getPosition(v._icon));
      v.disp = v.disp.subtract(
        normalize(dpos).multiplyBy(fa(dpos.distanceTo(L.point(0, 0)), k))
      );
    }

    // calculate layout
    for (const v of markerList) {
      const labelDom = v.getTooltip()._container;
      const { disp } = v;
      let p = getPosition(labelDom);
      const d = scaleTo(
        normalize(disp),
        L.point(Math.min(Math.abs(disp.x), t), Math.min(Math.abs(disp.y), t))
      );
      p = p.add(d);
      p = L.point(Math.ceil(p.x), Math.ceil(p.y));
      L.DomUtil.setTransform(labelDom, p);
    }
  }

  function layoutByForce() {
    const start = Math.ceil(map._container.offsetWidth / getLineLengthDivisor());
    const times = 50;
    let t;
    for (let i = 0; i < times; i++) {
      t = start * (1 - (i / (times - 1)));
      computePositionStep(t);
    }

    for (const v of markerList) {
      const labelDom = v.getTooltip()._container;
      let p = getPosition(labelDom);
      const width = labelDom.offsetWidth;
      const height = labelDom.offsetHeight;
      p = L.point(Math.ceil(p.x - (width / 2)), Math.ceil(p.y - (height / 2)));
      L.DomUtil.setTransform(labelDom, p);
    }
  }

  function setEdgePosition() {
    const bounds = map.getBounds();
    const northWest = map.latLngToLayerPoint(bounds.getNorthWest());
    const southEast = map.latLngToLayerPoint(bounds.getSouthEast());

    for (const v of markerList) {
      const labelDom = v.getTooltip()._container;
      const tooltip = getPosition(labelDom);
      const marker = getPosition(v._icon);
      const width = labelDom.offsetWidth;
      const height = labelDom.offsetHeight;

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

      L.DomUtil.setTransform(labelDom, tooltip);
    }
  }

  function setLineLength(length) {
    lineLength = length;
  }

  function getLineLengthDivisor() {
    return Math.pow(2, 7 - lineLength);
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
  TooltipLayout['setLineLength'] = setLineLength;

  return TooltipLayout;
}, window);
