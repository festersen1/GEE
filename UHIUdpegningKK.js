// Define a region of interest:
var roi = download_extent;
// Centre map layout 
// Map.centerObject(roi, 12);  
// Områder, der skal undersøges // Regions of Interest
landsat_roi = landsat_roi 


// -----------------------------------------------------------
//                    Input data
// -----------------------------------------------------------
 // clean up 
function cleanUpAllLandsat(image) {
  // Develop masks for unwanted pixels (fill, cloud, cloud shadow).
  var qaMask = image.select('QA_PIXEL').bitwiseAnd(parseInt('11111', 2)).eq(0);
  var saturationMask = image.select('QA_RADSAT').eq(0);
  // Replace original bands with scaled bands and apply masks.
  return image.updateMask(qaMask).updateMask(saturationMask);
}

// ~~~~~~~~~~~~~~~~~~~~~~~~
//    Landsat mean 1984-2022
// ~~~~~~~~~~~~~~~~~~~~~~~~
var landsat8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterDate('2013-06-01','2030-12-31')
  .filterBounds(roi)
  .map(cleanUpAllLandsat)
  .map(function(image) {
       var ndvi = image.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI')
      .reproject('EPSG:25832',null, 30)
      var thermal = image.select('ST_B10').multiply(0.00341802).add(149.0).subtract(272.15).rename('LST')
      var timeband = ee.Number(image.get('system:time_start'))
  return image.addBands(ndvi).addBands(image.metadata('system:time_start').divide(1e18)).addBands(thermal).set('system:time_start', image.get('system:time_start')).set('Date', ee.Date(image.get('system:time_start')));  
  }); 

var landsat9 = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
  .filterDate('2013-06-01','2030-12-31')
  .filterBounds(roi)
  .map(cleanUpAllLandsat)
  .map(function(image) {
       var ndvi = image.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI')
      .reproject('EPSG:25832',null, 30)
      var thermal = image.select('ST_B10').multiply(0.00341802).add(149.0).subtract(272.15).rename('LST')
      var timeband = ee.Number(image.get('system:time_start'))

  return image.addBands(ndvi).addBands(image.metadata('system:time_start').divide(1e18)).addBands(thermal).set('system:time_start', image.get('system:time_start')).set('Date', ee.Date(image.get('system:time_start')));  
  }); 


var landsat5 = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
.filterBounds(roi)
.map(cleanUpAllLandsat)
.filterDate('1984-06-01', '2013-12-31')
.map(function(image) {
       var ndvi = image.normalizedDifference(['SR_B4', 'SR_B3']).rename('NDVI')
      .reproject('EPSG:25832', null, 30)
      var thermal = image.select('ST_B6').multiply(0.00341802).add(149.0).subtract(272.15).rename('LST').reproject('EPSG:25832', null, 30)
      var timeband = ee.Number(image.get('system:time_start'));
 return image.addBands(ndvi).addBands(image.metadata('system:time_start').divide(1e18)).addBands(thermal).set('system:time_start', image.get('system:time_start')).set('Date', ee.Date(image.get('system:time_start')));  
  }); 
  


// Combine images
var LST_all = landsat5.merge(landsat8)


//*** Visulisering af sommertemperaturer***
// Filtrering af image collection
var LSTMap2017 = LST_all.select('LST').filterDate('2017-07-01', '2017-08-10').mean()
var LSTMap2018 = LST_all.select('LST').filterDate('2018-06-15', '2018-08-01').first()
var LSTMap2019 = LST_all.select('LST').filterDate('2019-07-01', '2019-08-10').mean()
var LSTMap2020 = LST_all.select('LST').filterDate('2020-08-10', '2020-08-12').first()
var LSTMap2021 = LST_all.select('LST').filterDate('2021-08-22', '2021-08-24').first()
var LSTMap2022 = LST_all.select('LST').filterDate('2022-06-12', '2022-08-30').first()

// Visualiseringsparamtre 
var LSTVisparam = {
'bands': ["LST"],
'max': 30,
'min': 10,
'palette': ["0012e7","00ffd0","fff700","ff0000"]
}
var UHIVisParam = {
'max': 45,
'min': 38,
'palette': ["fc5c51","fc3628","e627bc"]
}

var UCIVisParam = {
'max': 25,
'min': 20,
'palette': ["2435ff"]
}

Map.addLayer(LSTMap2017,LSTVisparam,'LST 2017 sommer', false)
Map.addLayer(LSTMap2020,LSTVisparam,'LST 2020 sommer',false)
Map.addLayer(LSTMap2021,LSTVisparam,'LST 2021 sommer',false)
Map.addLayer(LSTMap2022,LSTVisparam,'LST 2022 sommer',false)

// Udpegning af Varme og kolde områder 
// Inputbillede
var inputLST = ee.ImageCollection([LSTMap2020.select('LST'), LSTMap2021.select('LST'),LSTMap2022.select('LST')])
var inputLST = inputLST.mean()
var inputLST = inputLST.clip(kk_graense_poly)


var stdLST = inputLST.reduceRegion(ee.Reducer.stdDev(), kk_graense_poly, 30)
var stdLST = ee.Number(stdLST.get('LST')).multiply(2)

print('StandardDev',stdLST.divide(2))


var meanLST = inputLST.reduceRegion(ee.Reducer.mean(), kk_graense_poly, 30)
var meanLST = ee.Number(meanLST.get('LST'))
print('GNS',meanLST)
var graenseUHI = meanLST.add(stdLST)
var graenseUCI = meanLST.subtract(stdLST)

// Varme og kold
var UHImask = inputLST.select('LST').gt(graenseUHI);
var UCImask = inputLST.select('LST').lt(graenseUCI);

//Update the composite mask with the water mask.
var UHI = inputLST.updateMask(UHImask);
var UCI = inputLST.updateMask(UCImask);
Map.addLayer(UHI,UHIVisParam,'UHI')
Map.addLayer(UCI,UCIVisParam,'Cold Areas')

Export.image.toDrive(UHI,'UHI', 'kk', 'UHI', null, kk_graense_poly, 30, 'EPSG:25832', null, 892227573613) 
Export.image.toDrive(UCI,'UCI', 'kk', 'UCI', null, kk_graense_poly, 30, 'EPSG:25832', null, 892227573613) 

Export.image.toDrive(inputLST,'uhi_gns_20_21_22', 'kk', 'uhi_gns_20_21_22', null, kk_graense_poly, 30, 'EPSG:25832', null, 892227573613) 
