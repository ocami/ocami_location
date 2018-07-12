//locationForm plug-in//////
(function ($) {
    var $output;

    var $locationContainer = $("<div class='col-xs-offset-1 col-xs-6'>");
    var $locationAlert = $("<div id='location_alert' class='alert alert-warning' role='alert' style='display: none'></div>");
    var $locationLoader = $("<div class='loader-div'></div>");
    var $locationForm = $("<div id='location_form' class='form-group'>");
    var $locationLabel = $("<label id='location_label'>Département</label>");
    var $locationInput = $("<input id='location_input' class='form-control' placeholder='Ex : 06 Alpes-Maritimes'>");
    var $locationBtnNextStep = $("<button id='next_step_btn' class='col-xs-2  btn btn-primary btn-sm' value='depValidate'>Suivant</button>");
    var $locationShow = $("<div id='location-show' class='col-xs-5'></div>");

    $.fn.locationForm = function (options) {

        var defaults = {"update": false};
        var parameters = $.extend(defaults, options);

        $output = parameters.output;

        $locationForm.append([$locationLabel, $locationInput]);
        $locationContainer.append([$locationAlert, $locationLoader, $locationForm, $locationBtnNextStep, $locationShow]);
        this.append([$locationContainer, $locationShow]);

        if ($output.val().length !== 0) {
            locationUpdate($.parseJSON($output.val()));
            return this;
        }

        depAutocomplete();

        return this;
    };

    //Initialize**************************************************************
    var depCode;
    var dep;
    var cityCode;
    var locationData;
    var locationDataIsValide = false;
    var locationMap;


    $locationInput.on('keyup', function (e) {
        if (e.keyCode === 13) {
            $locationBtnNextStep.trigger('click');
        }
    });


    //Step**************************************************************
    function nextStep(step) {
        switch (step) {
            case 'dep' :
                depAutocomplete();
                $locationLabel.text('Département');
                $locationInput.attr("placeholder", "Ex : 06 Alpes-Maritimes");
                $locationBtnNextStep.val('depValidate');
                loaderDivStop($locationForm);
                break;

            case 'depValidate' :
                loaderDivStart($locationForm);
                depValidate();
                break;

            case 'city' :
                cityAutocomplete(depCode);
                $locationLabel.text('Ville');
                $locationInput.attr("placeholder", "Ex : nice");
                $locationBtnNextStep.val('cityValidate');
                break;

            case 'cityValidate' :
                loaderDivStart($locationForm);
                cityValidate();
                break;

            case 'address' :
                addressAutocomplete(cityCode);
                $locationLabel.text('Adresse');
                $locationInput.attr("placeholder", "Ex : 5 Promenade des Anglais");
                $locationBtnNextStep.val('addressValidate');
                loaderDivStop($locationForm);
                break;

            case 'addressValidate' :
                addressValidate();
                break;

            case 'confirm' :
                $locationForm.hide();
                $locationBtnNextStep.hide();
                locationConfirm();
                break;
        }

        $locationInput.focus();
    }

    function returnStep(step) {
        $locationInput.val('');
        $locationForm.show();
        $locationBtnNextStep.show();
        locationDataIsValide = false;

        switch (step) {
            case 'dep' :
                $('#show_dep').remove();
                depCode = '';

            case  'city' :
                $('#show_city').remove();
                cityCode = '';

            case  'address' :
                $('#show_address').remove();
                locationData = '';
                if (typeof locationMap !== 'undefined')
                    locationMap.remove();
        }
        nextStep(step);
        $output.val('');
        $output.trigger('change');
    }

    //Dep**************************************************************
    function depAutocomplete() {
        $.get('/oc_location/departements.json', function (data, status) {
            $locationInput.autocomplete({
                source: data,
                messages: {
                    noResults: '',
                    results: function () {
                    }
                },
                focus: function (event, ui) {
                    $(".ui-helper-hidden-accessible").hide();
                }
            });


            /*  $locationInput.autocomplete({
                  source: data
              })*/
        });
    }

    function depValidate() {
        dep = $locationInput.val();
        depCode = dep.slice(0, 2);
        $locationAlert.hide();

        $.get("/webSport/web/json/departements.json", function (data, status) {
            if ($.inArray($locationInput.val(), data) !== -1) {
                addShowElement($locationInput.val(), 'dep');
                $locationInput.val('');
                nextStep('city');
            } else {
                nextStep('dep');
                $locationAlert.text('Veuillez sélectionner un département dans la liste');
                $locationAlert.show();
            }
        });
    }

    //City*************************************************************
    function cityAutocomplete(dep) {
        var path = Routing.generate('address_getCitiesSlugByDep', {dep: dep});
        $.ajax({
            url: path,
            success: function (data) {
                var cities = [];
                $.map(data, function (item) {
                    cities.push(item.villeSlug);
                });

                $locationInput.autocomplete({
                    source: cities,
                    messages: {
                        noResults: '',
                        results: function () {
                        }
                    },
                    focus: function (event, ui) {
                        $(".ui-helper-hidden-accessible").hide();
                    }
                });

                loaderDivStop($locationForm);
                $locationInput.focus();
            }
        });
    }

    function cityValidate() {
        var citySlug = $locationInput.val();
        $locationInput.val('');
        $locationAlert.hide();

        $.ajax({
            url: Routing.generate('address_getCitiesData', {ville_slug: citySlug}),
            dataType: "json",
            success: function (data) {
                var cityData = data[0];

                if (data.length > 0 && citySlug == cityData.villeSlug) {
                    addShowElement(cityData.villeNomReel, 'city');
                    cityCode = cityData.villeCodeCommune;
                    nextStep('address');
                } else {
                    nextStep('city');
                    $locationAlert.text('Veuillez sélectionner une commune dans la liste');
                    $locationAlert.show();
                }
            }
        });

    }

    //Address**********************************************************
    function addressAutocomplete(cityCode) {
        $locationInput.autocomplete({
            source: function (request, response) {
                $.ajax({
                    url: "https://api-adresse.data.gouv.fr/search/?citycode=" + cityCode,
                    data: {q: request.term},
                    dataType: "json",
                    success: function (data) {
                        response($.map(data.features, function (item) {
                            var truc = {label: item.properties.name, value: item.properties.name};
                            return truc;
                        }));
                        autocompleteAddressList = data.features;
                    }
                });
            },
            messages: {
                noResults: '',
                results: function () {
                }
            },
            focus: function (event, ui) {
                $(".ui-helper-hidden-accessible").hide();
            }
        });
    }

    function addressValidate() {
        $.ajax({
            url: "https://api-adresse.data.gouv.fr/search/?citycode=" + cityCode,
            data: {q: $locationInput.val()},
            dataType: "json",
            success: function (data) {
                if (data.features.length > 0 && data.features[0].properties.name == $locationInput.val()) {
                    var locationFeatures = data.features[0];
                    addShowElement(locationFeatures.properties.name, 'address');
                    setLocationData(locationFeatures);
                    $locationAlert.hide();
                    nextStep('confirm');
                } else {
                    $locationAlert.text('Veuillez sélectionner une adresse dans la liste');
                    $locationAlert.show();
                    nextStep('address');
                }
            },
            error: function () {
                ajaxError();
            }
        });
    }

    //Confirm**********************************************************
    function locationConfirm() {
        locationMap = $("<div>", {id: "location-map"});
        $locationForm.after(locationMap);
        openLocationMap(locationData.x, locationData.y, 'location-map');

        locationDataIsValide = true;


        $output.val(JSON.stringify(locationData));
        $output.trigger('change');
    }

    //Events************************************************************
    $locationShow.on('click', 'button', function (evt) {
        returnStep($(this).val());
    });

    $locationBtnNextStep.click(function () {
        nextStep($(this).val());
    });

    //Other************************************************************

    function addShowElement(text, step) {

        var div = $("<div>", {id: "show_" + step, class: "form_show row "});
        var txt = $("<p>", {class: "col-xs-7"}).append(text);
        var btn = $("<button>", {
            class: "col-xs-2 edit_bt btn btn-success btn-xs",
            value: step
        }).append('modifier');

        div.append(txt);
        div.append(btn);

        $locationShow.append(div);
    }

    function setLocationData(locationFeatures) {
        var f = locationFeatures;
        locationData = {
            id: f.properties.id,
            street: f.properties.name,
            depCode: depCode,
            dep: dep,
            postCode: f.properties.postcode,
            cityCode: cityCode,
            city: f.properties.city,
            x: f.geometry.coordinates[1],
            y: f.geometry.coordinates[0]
        }
    }

    function locationUpdate(data) {

        $locationBtnNextStep.hide();
        $locationForm.hide();

        depCode = data.depCode;
        cityCode = data.cityCode;

        addShowElement(data.dep, 'dep');
        addShowElement(data.city, 'city');
        addShowElement(data.street, 'address');

        locationMap = $("<div>", {id: "location-map"});
        $locationForm.after(locationMap);
        openLocationMap(data.x, data.y, 'location-map');


        locationDataIsValide = true;
    }

    // map leaflet**************************************************************************************************>
    function openLocationMap(x, y, mapId) {
        var map = L.map(mapId, {
            center: [x, y],
            zoom: 18,
        });
        L.marker([x, y]).addTo(map);
        L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
            maxZoom: 18
        }).addTo(map);
    }

}(jQuery));

function loaderDivStart(divToLoad) {

    var $loaderDiv = $("#loader-div");

    $loaderDiv.height(divToLoad.height());
    $loaderDiv.width(divToLoad.width());
    divToLoad.hide();

    $loaderDiv.show();
}

function loaderDivStop(divToLoad) {
    var $loaderDiv = $("#loader-div");
    $loaderDiv.hide();
    divToLoad.show();
}
