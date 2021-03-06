'use strict';
(function (angular) {
    angular
        .module('couponPluginContent')
        .controller('ContentItemCtrl', ['$scope', '$routeParams', '$timeout', 'DEFAULT_DATA', 'DataStore', 'TAG_NAMES', 'Location', 'Utils', 'Modals', 'RankOfLastFilter', 'Buildfire',
            function ($scope, $routeParams, $timeout, DEFAULT_DATA, DataStore, TAG_NAMES, Location, Utils, Modals, RankOfLastFilter, Buildfire) {
                var ContentItem = this;
                var tmrDelayForItem = null
                    , isNewItemInserted = false
                    , updating = false;
                ContentItem.filters=[];

                /**
                 * This updateMasterItem will update the ContentMedia.masterItem with passed item
                 * @param item
                 */
                function updateMasterItem(item) {
                    ContentItem.masterItem = angular.copy(item);
                }

                /**
                 * This resetItem will reset the ContentMedia.item with ContentMedia.masterItem
                 */
                function resetItem() {
                    ContentItem.item = angular.copy(ContentItem.masterItem);
                }


                /**
                 * isUnChanged to check whether there is change in controller media item or not
                 * @param item
                 * @returns {*|boolean}
                 */
                function isUnChanged(item) {
                    return angular.equals(item, ContentItem.masterItem);
                }

                function isValidItem(item) {
                    return item.title;
                }


                function insertAndUpdate(_item) {
                    updating = true;
                    if (_item.id) {
                        DataStore.update(_item.id, _item.data, TAG_NAMES.COUPON_ITEMS).then(function (data) {
                            console.log('Item updated successfully-----', data);
                            updateMasterItem(data);
                            updating = false;
                        }, function (err) {
                            console.error('Error: while updating item--:', err);
                            resetItem();
                            updating = false;
                        });
                    }
                    else if (!isNewItemInserted) {
                        isNewItemInserted = true;
                        _item.data.dateCreated = +new Date();
                        DataStore.insert(_item.data, TAG_NAMES.COUPON_ITEMS).then(function (data) {
                            updating = false;
                            if (data && data.id) {
                                ContentItem.item.data.deepLinkUrl = buildfire.deeplink.createLink({id: data.id});
                                ContentItem.item.id = data.id;
                                updateMasterItem(ContentItem.item);
                            }
                            else {
                                isNewItemInserted = false;
                            }
                        }, function (err) {
                            console.error('Error: while inserting item--:', err);
                            resetItem();
                            updating = false;
                            isNewItemInserted = false;
                        });
                    }
                }

                /**
                 * updateItemsWithDelay called when ever there is some change in current item
                 * @param _item
                 */
                function updateItemsWithDelay(_item) {
                    if (updating)
                        return;
                    if (tmrDelayForItem) {
                        $timeout.cancel(tmrDelayForItem);
                    }
                    ContentItem.isItemValid = isValidItem(ContentItem.item.data);
                    if (_item && !isUnChanged(_item) && ContentItem.isItemValid) {
                        tmrDelayForItem = $timeout(function () {
                            insertAndUpdate(_item);
                        }, 300);
                    }
                }

                function init() {
                    if ($routeParams.id) {
                    }
                    else {


                        var searchOptions={
                            "filter":{"$json.title": {"$regex": '/*'}},
                            "sort": {"title": 1},
                            "skip":"0",
                            "limit":"50"
                        };

                        Buildfire.datastore.search(searchOptions, TAG_NAMES.COUPON_CATEGORIES, function (err, result) {
                            ContentItem.item = angular.copy(DEFAULT_DATA.ITEM);
                            if (err) {
                                Buildfire.spinner.hide();
                                return console.error('-----------err in getting list-------------', err);
                            }
                            var tmpArray=[];
                            var lastIndex=result.length;
                            result.forEach(function(res,index){
                                tmpArray.push({'title' : res.data.title,
                                    id:res.data.id});
                            });

                            ContentItem.item.data.Categories = tmpArray;
                            updateMasterItem(ContentItem.item);
                            Buildfire.spinner.hide();
                            $scope.$digest();
                        });


                    }
                }

                init();


                ContentItem.addListImage = function () {
                    var options = {showIcons: false, multiSelection: false},
                        listImgCB = function (error, result) {
                            if (error) {
                                console.error('Error:', error);
                            } else {
                                ContentItem.item.data.listImage = result && result.selectedFiles && result.selectedFiles[0] || null;
                                if (!$scope.$$phase)$scope.$digest();
                            }
                        };
                    buildfire.imageLib.showDialog(options, listImgCB);
                };
                ContentItem.removeListImage = function () {
                    ContentItem.item.data.listImage = null;
                };

                /**
                 * done will close the single item view
                 */
                ContentItem.done = function () {
                    Location.goToHome();
                };
                ContentItem.setLocation = function (data) {
                    console.log('setLocation-------------------method called-----------', data);
                    ContentItem.item.data.location = {
                        coordinates: {
                            lng: data.coordinates[0],
                            lat: data.coordinates[1]
                        },
                        addressTitle: data.location
                    };
                    $timeout(function () {
                        ContentItem.currentAddress = data.location;
                        ContentItem.currentCoordinates = data.coordinates;
                    }, 0);
                };

                ContentItem.setDraggedLocation = function (data) {
                    ContentItem.item.data.address = {
                        lng: data.coordinates[0],
                        lat: data.coordinates[1],
                        aName: data.location
                    };
                    ContentItem.currentAddress = data.location;
                    ContentItem.currentCoordinates = data.coordinates;
                    $scope.$digest();
                };
                ContentItem.setCoordinates = function () {
                    var latlng = '';
                    console.log('ng-enter---------------------called------------------', ContentItem.currentAddress);
                    function successCallback(resp) {
                        console.error('Successfully validated coordinates-----------', resp);
                        if (resp) {
                            ContentItem.item.data.address = {
                                lng: ContentItem.currentAddress.split(",")[1].trim(),
                                lat: ContentItem.currentAddress.split(",")[0].trim(),
                                aName: ContentItem.currentAddress
                            };
                            ContentItem.currentCoordinates = [ContentItem.currentAddress.split(",")[1].trim(), ContentItem.currentAddress.split(",")[0].trim()];
                        } else {
                            //errorCallback();
                        }
                    }

                    function errorCallback(err) {
                        console.error('Error while validating coordinates------------', err);
                        ContentItem.validCoordinatesFailure = true;
                        $timeout(function () {
                            ContentItem.validCoordinatesFailure = false;
                        }, 5000);
                    }

                    if (ContentItem.currentAddress) {
                        latlng = ContentItem.currentAddress.split(',')[1] + "," + ContentItem.currentAddress.split(',')[0]
                    }

                    Utils.validLongLats(latlng).then(successCallback, errorCallback);
                };
                ContentItem.clearData = function () {
                    if (!ContentItem.currentAddress) {
                        ContentItem.item.data.address = {
                            lng: '',
                            lat: '',
                            aName: ''
                        };
                        ContentItem.currentCoordinates = null;
                    }
                };

                ContentItem.validCopyAddressFailure = false;
                ContentItem.locationAutocompletePaste = function () {
                    function error() {
                        console.error('ERROOR emethpdd called');
                        ContentItem.validCopyAddressFailure = true;
                        $timeout(function () {
                            ContentItem.validCopyAddressFailure = false;
                        }, 5000);

                    }

                    $timeout(function () {
                        console.log('val>>>', $("#googleMapAutocomplete").val());
                        console.log('.pac-container .pac-item', $(".pac-container .pac-item").length);
                        if ($(".pac-container .pac-item").length) {
                            var firstResult = $(".pac-container .pac-item:first").find('.pac-matched').map(function () {
                                return $(this).text();
                            }).get().join(); // + ', ' + $(".pac-container .pac-item:first").find('span:last').text();
                            console.log('firstResult', firstResult);
                            var geocoder = new google.maps.Geocoder();
                            geocoder.geocode({"address": firstResult}, function (results, status) {
                                if (status == google.maps.GeocoderStatus.OK) {
                                    var lat = results[0].geometry.location.lat(),
                                        lng = results[0].geometry.location.lng();
                                    ContentItem.setLocation({location: firstResult, coordinates: [lng, lat]});
                                    $("#googleMapAutocomplete").blur();
                                }
                                else {
                                    console.error('' +
                                        'Error else parts of google');
                                    error();
                                }
                            });
                        }
                        else if (ContentItem.currentAddress && ContentItem.currentAddress.split(',').length) {
                            console.log('Location found---------------------', ContentItem.currentAddress.split(',').length, ContentItem.currentAddress.split(','));
                            ContentItem.setCoordinates();
                            /*var geocoder = new google.maps.Geocoder();
                             geocoder.geocode({
                             "latLng": {
                             "lat": parseInt(ContentItem.currentAddress.split(',')[0]),
                             "lng": parseInt(ContentItem.currentAddress.split(',')[1])
                             }
                             }, function (results, status) {
                             console.log('Got Address based on coordinates--------------------', results, status);
                             if (status == google.maps.GeocoderStatus.OK) {
                             var lat = results[0].geometry.location.lat(),
                             lng = results[0].geometry.location.lng();
                             ContentItem.setLocation({location: ContentItem.currentAddress, coordinates: [lng, lat]});
                             $("#googleMapAutocomplete").blur();
                             }
                             else {
                             console.error('' +
                             'Error else parts of google');
                             error();
                             }
                             });*/
                        }
                        else {
                            error();
                        }
                    }, 1000);

                };


                ContentItem.addFilter = function () {
                    Modals.addFilterModal({
                        title: '',
                        isEdit: false
                    }).then(function (response) {
                        console.log('Response of a popup----------------------------', response);
                        if (!(response.title === null || response.title.match(/^ *$/) !== null)) {

                            //if index is there it means filter update operation is performed
                            ContentItem.filter = {
                                title: response.title,
                                rank: RankOfLastFilter.getRank() + 1
                            };
                            //ContentItem.data.content.rankOfLastFilter = RankOfLastFilter.getRank() + 1;
                           // RankOfLastFilter.setRank(ContentItem.data.content.rankOfLastFilter);
                            ContentItem.filters.unshift(ContentItem.filter);
                            Buildfire.datastore.insert(ContentItem.filter, TAG_NAMES.COUPON_CATEGORIES, false, function (err, data) {
                                console.log("Saved", data.id);
                                ContentItem.isUpdating = false;
                                ContentItem.filter.id = data.id;
                                if (err) {
                                    ContentItem.isNewItemInserted = false;
                                    return console.error('There was a problem saving your data');
                                }
                                $scope.$digest();
                            });
                        }
                    }, function (err) {

                    });
                };

                //option for wysiwyg
                ContentItem.bodyWYSIWYGOptions = {
                    plugins: 'advlist autolink link image lists charmap print preview',
                    skin: 'lightgray',
                    trusted: true,
                    theme: 'modern',
                    plugin_preview_width: "500",
                    plugin_preview_height: "500"
                };

                $scope.$watch(function () {
                    return ContentItem.item;
                }, updateItemsWithDelay, true);

                /*
                 * watch for changes in filters and trigger the saveDataWithDelay function on change
                 * */
                $scope.$watch(function () {
                    return ContentHome.filter;
                }, updateItemsWithDelay, true);

            }]);
})(window.angular);