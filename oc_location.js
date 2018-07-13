(function ($) {
    var $output;

    var $container = $("<div class='col-xs-offset-1 col-xs-6'>");
    var $alert = $("<div class='alert alert-warning' role='alert' style='display: none'></div>");
    var $loader = $("<div class='loader-div'></div>");
    var $form = $("<div class='form-group'>");
    var $show = $("<div class='col-xs-5'></div>");

    $.fn.locationForm = function (options) {

        var defaults = {"update": false};
        var parameters = $.extend(defaults, options);

        $output = parameters.output;


        $container.append([$alert, $loader, $form, $show]);
        this.append([$container, $show]);

        /*if ($output.val().length !== 0) {
            locationUpdate($.parseJSON($output.val()));
            return this;
        }

        depAutocomplete();*/

        nextStep('dep');

        return this;
    };

    //Initialize**************************************************************
    var depCode;
    var dep;
    var cityCode;
    var address;
    var locationData;
    var locationDataIsValide = false;
    var locationMap;

    var accentMap = {
        "á": "a",
        "â": "a",
        "é": "e",
        "è": "e",
        "ë": "e",
        "ê": "e",
        "ù": "u",
        "î": "i",
        "ô": "o",
        "û": "u",
        "ï": "i",
        "ç": "c",
    };
    var normalize = function (term) {
        var ret = "";
        for (var i = 0; i < term.length; i++) {
            ret += accentMap[term.charAt(i)] || term.charAt(i);
        }
        return ret;
    };

    //Step**************************************************************
    function nextStep(step) {
        switch (step) {
            case 'dep' :
                var $label = $("<label>Département</label>");
                var $input = $("<input class='form-control' placeholder='Ex : 06 Alpes-Maritimes'>");
                $form.empty().append([$label, $input]);
                depAutocomplete($input);
                break;

            case 'city' :
                var $label = $("<label>Ville</label>");
                var $input = $("<input class='form-control' placeholder='Ex : nice'>");
                $form.empty().append([$label, $input]);
                cityAutocomplete($input);
                break;

            case 'address' :
                var $label = $("<label>Adresse</label>");
                var $input = $("<input class='form-control' placeholder='Ex : 5 Promenade des Anglais'>");
                $form.empty().append([$label, $input]);
                addressAutocomplete($input);
                break;

            case 'number' :
                var $label = $("<label>Numéro</label>");
                var $input = $("<input class='form-control' placeholder='Ex : 5 bis'>");
                var $container = $("<div class='col-xs-6'></div>");
                var $remove = $("<button>Pas de numéro</button>").click(function () {
                    nextStep('yep');
                });
                var $valid = $("<button>Valider</button>").click(function () {
                    checkNumber($input.val())
                });
                $form.empty().append([
                    $container.append([$label, $input]),
                    $container.append([$remove, $valid])
                ]);
                break;

            case 'yep' :
                $form.hide();
                addShowElement(address, 'address');
                locationConfirm();
                console.log('yyeeeeeeeeeeeeeeeeeeeeeeppppppp!!!');
                break;

            case 'confirm' :
                $form.hide();
                locationConfirm();
                break;
        }

        if ($input)
            $input.focus()

    }

    function returnStep(step) {

        $form.show();
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
        $output.trigger('change');
    }

    //Dep**************************************************************
    function depAutocomplete($input) {
        var features = [];
        $.ajax({
            url: "https://geo.api.gouv.fr/departements?fields=nom,code",
            dataType: "json",
            success: function (data) {
                data.map(function (item) {
                    features.push({
                        value: item.code + ' ' + item.nom,
                        label: item.code + ' ' + item.nom,
                        dep: item.code,
                    });
                });

                autocomplete(features);
            }
        });

        function autocomplete(features) {
            $input.autocomplete({
                source: function (request, response) {
                    var matcher = new RegExp($.ui.autocomplete.escapeRegex(request.term), "i");
                    response($.grep(features, function (value) {
                        value = value.label || value.value || value;
                        return matcher.test(value) || matcher.test(normalize(value));
                    }));
                },
                minLength: 2,
                select: function (event, ui) {
                    addShowElement(ui.item.value, 'dep');
                    dep = ui.item.dep;
                    nextStep('city');
                }
            })
        }
    }

    //City**************************************************************
    function cityAutocomplete($input) {
        var features = [];
        $.ajax({
            url: "https://geo.api.gouv.fr/departements/" + dep + "/communes?fields=nom,code,codesPostaux&format=json&geometry=centre",
            dataType: "json",
            success: function (data) {
                data.map(function (item) {
                    features.push({
                        alue: item.nom,
                        label: item.nom,
                        code: item.code,
                        postCode: item.codesPostaux[0]
                    });
                });

                autocomplete(features);
            }
        });

        function autocomplete(features) {
            $input.autocomplete({
                source: function (request, response) {
                    var matcher = new RegExp($.ui.autocomplete.escapeRegex(request.term), "i");
                    response($.grep(features, function (value) {
                        value = value.label || value.value || value;
                        return matcher.test(value) || matcher.test(normalize(value));
                    }));
                },
                minLength: 3,
                select: function (event, ui) {
                    addShowElement(ui.item.value, 'city');
                    cityCode = ui.item.code;
                    nextStep('address');
                }
            })
        }
    }

    //Address**********************************************************
    function addressAutocomplete($input) {
        console.log('yep');
        $input.autocomplete({
            source: function (request, response) {
                $.ajax({
                    url: "https://api-adresse.data.gouv.fr/search",
                    data: {
                        q: request.term,
                        citycode: cityCode
                    },
                    dataType: "json",
                    success: function (data) {
                        response($.map(data.features, function (item) {
                            return {
                                label: item.properties.name,
                                value: item.properties.name,
                                type: item.properties.type,
                                name: item.properties.label
                            };
                        }));
                    }
                });
            },
            select: function (event, ui) {
                address = ui.item.value;
                if (ui.item.type === 'housenumber')
                    confirm();
                else
                    nextStep('number');
            }
        });
    }

    function checkNumber(number) {

        $.ajax({
            url: "https://api-adresse.data.gouv.fr/search",
            data: {
                q: number + ' ' + address,
                cityCode: cityCode,
                type: 'housenumber',
                limit: 1
            },
            dataType: "json",
            success: function (data) {

                if (data.features) {
                    data = data.features[0].properties;
                    if (data.type === 'housenumber') {
                        address = data.name;
                        setLocationData(data.features[0]);
                        nextStep('yep');
                        return;
                    }
                }

                $alert.text("Aucune adresse connue pour ce numéro").show();
            }

        });
    }

    function confirm() {

        $.ajax({
            url: "https://api-adresse.data.gouv.fr/search",
            data: {
                q: address,
                cityCode: cityCode,
                limit: 1
            },
            dataType: "json",
            success: function (data) {

                if (data.features) {
                    setLocationData(data.features[0]);
                    nextStep('yep');
                    return;
                }

                $alert.text("Aucune adresse connue pour ce numéro").show();
            }

        });
    }

    /*function addressAutocomplete(cityCode) {
        $input.autocomplete({
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
            data: {q: $input.val()},
            dataType: "json",
            success: function (data) {
                if (data.features.length > 0 && data.features[0].properties.name == $input.val()) {
                    var locationFeatures = data.features[0];
                    addShowElement(locationFeatures.properties.name, 'address');
                    setLocationData(locationFeatures);
                    $alert.hide();
                    nextStep('confirm');
                } else {
                    $alert.text('Veuillez sélectionner une adresse dans la liste');
                    $alert.show();
                    nextStep('address');
                }
            },
            error: function () {
                ajaxError();
            }
        });
    }*/

    //Confirm**********************************************************
    function locationConfirm() {
        locationMap = $("<div>", {id: "location-map"});
        $form.after(locationMap);
        openLocationMap(locationData.x, locationData.y, 'location-map');

        $output.val(JSON.stringify(locationData));
        $output.trigger('change');
    }

    //Events************************************************************
    $show.on('click', 'button', function (evt) {
        returnStep($(this).val());
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

        $show.append(div);
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
        $form.hide();

        depCode = data.depCode;
        cityCode = data.cityCode;

        addShowElement(data.dep, 'dep');
        addShowElement(data.city, 'city');
        addShowElement(data.street, 'address');

        locationMap = $("<div>", {id: "location-map"});
        $form.after(locationMap);
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