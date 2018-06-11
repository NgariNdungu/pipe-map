var L, d3, showOnChart, xdom, ydom, x, y, ccircle, mapdata, selectActive, limits, addLimit, filtered, render, pipeline;

var map = L.map('map', {
    center: [ 51.950125555555559, 29.196484166666668 ],
    zoom: 9
});

var tileOptions = {
    noWrap: true,
    attribution: "&copy; <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors </br>"
};

var osmBase = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', tileOptions).addTo(map);

/*
geojson layer options
*/
var toolTip = function (d) {
  // format html for popup
    return "<table><tr><td>Section</td><td>" + d.properties.Section + "</td></tr>" +
    "<tr><td>Height</td><td>" + d.properties.Height + "</td></tr>" +
    "<tr><td>X</td><td>" + d.properties.X + "</td></tr>" +
    "<tr><td>Y</td><td>" + d.properties.Y + "</td></tr></table>";
};

var markerOptions = {
    radius: 5,
    fillColor: "steelblue",
    color: "#ff0000",
    fillOpacity: 0.2,
    opacity: 0.3,
    className: 'point'
};

var showOnChart = function (e) {
  // function to draw circle on chart on hover over map
  xdom = e.target.feature.properties.Section;
  ydom = e.target.feature.properties.Height;
  ccircle.attr('cx', x(xdom))
    .attr('cy', y(ydom))
    .style('display', 'block');
};

var geojsonOptions = {
    pointToLayer: function (feature, latlng) {
      return L.circleMarker(latlng, markerOptions);
    },
    onEachFeature: function (feature, layer) {
      layer.bindPopup(toolTip(feature), {closeOnClick: false});
      layer.off(); // disable popupopen on click
      layer.on('click', function (e) {
        if (selectActive === true) {
          addLimit(e);
        } else {
          layer.openPopup();
        }
        showOnChart(e);
      });
      // layer.on('mouseover', function (e) {
      //   layer.openPopup();
      //   showOnChart(e); });
    }
};

var pipe = L.geoJson(null, geojsonOptions);

// render points as line
var pipeoptions = {
  color: '#000000',
  weight: 3,
  opacity: 0.9,
  className: 'pipeline',
  interactive: false
};

var createlatlng = function (feature) {
  // coordinates are lnglat
  return [feature.geometry.coordinates[1], feature.geometry.coordinates[0]];
};

/*
 graph
*/

var chart = d3.select('#graph')
    .append('svg')
    .attr('class', 'chart')
    .attr('width', d3.select('#graph').property('clientWidth'))
    .attr('height', d3.select('#graph').property('clientHeight'));

var margins = { top: 20, right: 20, bottom: 30, left: 50 };
var height = +chart.attr('height') - margins.top - margins.bottom;
var width = +chart.attr('width') - margins.right - margins.left;

// chart container
var g = chart.append('g')
  .attr('transform', 'translate(' + margins.left + ',' + margins.top + ')');

var xaxis = g.append("g")
    .attr("transform", "translate(0," + height +")");

var yaxis = g.append("g")
  .attr("class", "yaxis")
  .append("text")
    .attr("fill", "#000")
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "end")
    .attr("x", -height/3)
    .attr("y", -35)
    .text("Height");


var linechart = g.append("path")
      .attr("fill", "none")
      .attr("stroke", "red")
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .attr("stroke-width", 1.5);

var ccircle = g.append('circle')
  .style('display', 'none')
  .attr('r', 5)
  .attr('fill', '#0f0');

// scales
var y = d3.scaleLinear().range([height, 0]);
var x = d3.scaleLinear().range([0, width]);

// line
var line = d3.line()
    .x(function (d) { return x(d.properties.Section); })
    .y(function (d) { return y(d.properties.Height); })
    .curve(d3.curveCardinal);

// fetch data
function fetchData(d) {
  mapdata = d;
  render(mapdata);
}

d3.json('assets/data/testing.geojson').then(fetchData);

function toggleSelect() {
  // start selection and clear limits
  selectActive = true;
  limits = [];
  map.closePopup();
}

function addLimit(e) {
  // add section limits and start data update
    limits.push(e.target.feature.properties.Section);
    d3.select(".feedback").attr("value",limits); // don't look good
    if (limits.length === 2) {
      selectActive = false;
      d3.select(".reset").attr("disabled",null);
      updateData();
    }
  }

function updateData() {
  // make a copy of the data
  filtered = Object.assign({},mapdata);
  if (limits !== undefined && limits.length >= 2) {
    filtered.features = mapdata.features.filter( function (d) {
      // if (d.properties.Section >= d3.min(limits) && d.properties.Section <= d3.max(limits)) {
      //   return d;
      // }
      return (d.properties.Section >= d3.min(limits) && d.properties.Section <= d3.max(limits));
    });
  }
  // remove points and line before redrawing
  limits = []
  ccircle.style("display", "none");
  pipe.clearLayers();
  map.removeLayer(pipeline);
  render(filtered);
}

function resetViews() {
  d3.select(".reset").attr("disabled", "");
  d3.select(".feedback").attr("value", "No Selection");
  updateData()
}

function render(data) {
  pipe.addData(data).addTo(map);
  var latlngs = data.features.map(createlatlng);
  pipeline = L.polyline(latlngs, pipeoptions).addTo(map);
  map.fitBounds(pipeline.getBounds());
  pipeline.bringToBack();


  // domains
  var extent = d3.extent(data.features, function (d) { return d.properties.Section; });
  x.domain([extent[1], extent[0]]).nice().clamp(true);
  y.domain(d3.extent(data.features, function(d) { return d.properties.Height; })).nice();

  // update chart
  xaxis.call(d3.axisBottom(x));

  d3.select(".yaxis").call(d3.axisLeft(y));
  linechart.datum(data.features)
    .attr('d', line);

}
