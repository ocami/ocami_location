(function ($) {
    var $output;

    var $container = $("<div class='col-xs-offset-1 col-xs-6'>");
    var $alert = $("<div class='alert alert-warning' role='alert' style='display: none'></div>");
    var $loader = $("<div class='loader-div'></div>");
    var $form = $("<div class='form-group'>");
    var $show = $("<div class='col-xs-5 show'></div>");

    $.fn.locationForm = function (options) {

        var defaults = {"update": false};
        var parameters = $.extend(defaults, options);

        $output = parameters.output;


        $container.append([$alert, $loader, $form, $show]);
        this.append([$container, $show]).addClass('ocm-location');

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
    var $locationMap;
    var $alertFocus = false;

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
                $alertFocus = true;
                depAutocomplete($input);
                break;

            case 'city' :
                var $label = $("<label>Ville</label>");
                var $input = $("<input class='form-control' placeholder='Ex : nice'>");
                $form.empty().append([$label, $input]);
                cityAutocomplete($input);
                $alertFocus = true;
                break;

            case 'address' :
                var $label = $("<label>Adresse</label>");
                var $input = $("<input class='form-control' placeholder='Ex : 5 Promenade des Anglais'>");
                $form.empty().append([$label, $input]);
                addressAutocomplete($input);
                $alertFocus = false;
                break;

            case 'number' :
                var $label = $("<label>Numéro</label>");
                var $input = $("<input class='form-control' placeholder='Ex : 5 bis'>")
                    .on('keydown', function (e) {
                        $alert.hide();
                        if (e.keyCode === 13) {
                            $btValid.trigger('click');
                        }
                    });
                var $container = $("<div>", {class: "col-xs-6"});
                var $container2 = $("<div>", {class: "col-xs-6"});
                var $btRemove = $("<button>", {
                    class: "btn btn-success btn-xs remove col-xs-12",
                    value: step
                }).append('Pas de numéro').click(function () {
                    confirm();
                    $alert.hide();
                });
                var $btValid = $("<button>", {
                    class: "btn btn-info btn-valid",
                    value: step
                }).append('Valider').click(function () {
                    checkNumber($input.val());
                });

                $form.empty().append([
                    $container.append([$label, $input, $btRemove]),
                    $container2.append($btValid)
                ]);
                $alertFocus = false;
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

        if ($alertFocus){
            $input.focusout(function () {
                $alert.empty().text("Veuilez sélectionner dans la liste").show();
            });
            $input.focus(function () {
                $alert.hide();
                $(this).data("uiAutocomplete").search($(this).val());
            });
        }

    }

    function returnStep(step) {

        $form.show();

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
                if (typeof $locationMap !== 'undefined')
                    $locationMap.remove();
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

                console.log('my data  citycode :' + cityCode + ' address : ' + address);


                if (data.features) {
                    p = data.features[0].properties;
                    console.log('return data  citycode :' + p.citycode + ' address : ' + p.street);
                    if (p.type === 'housenumber' && p.citycode === cityCode && p.street === address) {
                        address = p.name;
                        setLocationData(data.features[0]);
                        nextStep('yep');
                        return;
                    }
                }
                $alert.empty().text("Aucune adresse connue pour ce numéro").show();
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

    //Confirm**********************************************************
    function locationConfirm() {
        $locationMap = $("<div>", {id: "ocm-location-map"});
        $form.after($locationMap);
        openLocationMap(locationData.x, locationData.y, 'ocm-location-map');

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

        $show.append(div.append([txt, btn]));
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

        $locationMap = $("<div>", {id: "location-map"});
        $form.after($locationMap);
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
