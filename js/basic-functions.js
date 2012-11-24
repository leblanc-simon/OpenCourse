function uniqid (prefix, more_entropy) {
    // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +    revised by: Kankrelune (http://www.webfaktory.info/)
    // %        note 1: Uses an internal counter (in php_js global) to avoid collision
    // *     example 1: uniqid();
    // *     returns 1: 'a30285b160c14'
    // *     example 2: uniqid('foo');
    // *     returns 2: 'fooa30285b1cd361'
    // *     example 3: uniqid('bar', true);
    // *     returns 3: 'bara20285b23dfd1.31879087'
    if (typeof prefix == 'undefined') {
        prefix = "";
    }

    var retId;
    var formatSeed = function (seed, reqWidth) {
        seed = parseInt(seed, 10).toString(16); // to hex str
        if (reqWidth < seed.length) { // so long we split
            return seed.slice(seed.length - reqWidth);
        }
        if (reqWidth > seed.length) { // so short we pad
            return Array(1 + (reqWidth - seed.length)).join('0') + seed;
        }
        return seed;
    };

    // BEGIN REDUNDANT
    if (!this.php_js) {
        this.php_js = {};
    }
    // END REDUNDANT
    if (!this.php_js.uniqidSeed) { // init seed with big random int
        this.php_js.uniqidSeed = Math.floor(Math.random() * 0x75bcd15);
    }
    this.php_js.uniqidSeed++;

    retId = prefix; // start with prefix, add current milliseconds hex string
    retId += formatSeed(parseInt(new Date().getTime() / 1000, 10), 8);
    retId += formatSeed(this.php_js.uniqidSeed, 5); // add seed hex string
    if (more_entropy) {
        // for more entropy we add a float lower to 10
        retId += (Math.random() * 10).toFixed(8).toString();
    }

    return retId;
}

function str_pad (input, pad_length, pad_string, pad_type) {
    // http://kevin.vanzonneveld.net
    // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // + namespaced by: Michael White (http://getsprink.com)
    // +      input by: Marco van Oort
    // +   bugfixed by: Brett Zamir (http://brett-zamir.me)
    // *     example 1: str_pad('Kevin van Zonneveld', 30, '-=', 'STR_PAD_LEFT');
    // *     returns 1: '-=-=-=-=-=-Kevin van Zonneveld'
    // *     example 2: str_pad('Kevin van Zonneveld', 30, '-', 'STR_PAD_BOTH');
    // *     returns 2: '------Kevin van Zonneveld-----'
    var half = '',
        pad_to_go;

    var str_pad_repeater = function (s, len) {
        var collect = '',
            i;

        while (collect.length < len) {
            collect += s;
        }
        collect = collect.substr(0, len);

        return collect;
    };

    input += '';
    pad_string = pad_string !== undefined ? pad_string : ' ';

    if (pad_type != 'STR_PAD_LEFT' && pad_type != 'STR_PAD_RIGHT' && pad_type != 'STR_PAD_BOTH') {
        pad_type = 'STR_PAD_RIGHT';
    }
    if ((pad_to_go = pad_length - input.length) > 0) {
        if (pad_type == 'STR_PAD_LEFT') {
            input = str_pad_repeater(pad_string, pad_to_go) + input;
        } else if (pad_type == 'STR_PAD_RIGHT') {
            input = input + str_pad_repeater(pad_string, pad_to_go);
        } else if (pad_type == 'STR_PAD_BOTH') {
            half = str_pad_repeater(pad_string, Math.ceil(pad_to_go / 2));
            input = half + input + half;
            input = input.substr(0, pad_length);
        }
    }

    return input;
}

function in_array (needle, haystack, argStrict) {
    // http://kevin.vanzonneveld.net
    // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +   improved by: vlado houba
    // +   input by: Billy
    // +   bugfixed by: Brett Zamir (http://brett-zamir.me)
    // *     example 1: in_array('van', ['Kevin', 'van', 'Zonneveld']);
    // *     returns 1: true
    // *     example 2: in_array('vlado', {0: 'Kevin', vlado: 'van', 1: 'Zonneveld'});
    // *     returns 2: false
    // *     example 3: in_array(1, ['1', '2', '3']);
    // *     returns 3: true
    // *     example 3: in_array(1, ['1', '2', '3'], false);
    // *     returns 3: true
    // *     example 4: in_array(1, ['1', '2', '3'], true);
    // *     returns 4: false
    var key = '',
        strict = !! argStrict;

    if (strict) {
        for (key in haystack) {
            if (haystack[key] === needle) {
                return true;
            }
        }
    } else {
        for (key in haystack) {
            if (haystack[key] == needle) {
                return true;
            }
        }
    }

    return false;
}


/**
 * Concat JSON object
 *
 * @param   object  o1  A JSON object to concat
 * @param   object  o2  A JSON object to concat
 * @return  object      The result of concat the 2 objects
 */
function jsonConcat(o1, o2)
{
  for (var key in o2) {
    o1[key] = o2[key];
  }
  
  return o1;
}


/**
 * Convert a time (microtime) into human readable string
 *
 * @param   int     ms                  time in microseconds
 * @param   bool    without_seconds     show human readable without second (only hour and minute) if this param = true
 * @return  string                      human readable string
 */
function msToHour(ms, without_seconds)
{
  var x = ms / 1000
  var seconds = x % 60
  x /= 60
  var minutes = x % 60
  x /= 60
  var hours = x % 24
  
  if (without_seconds && without_seconds == true) {
    return str_pad(parseInt(hours).toString(), 2, '0', 'STR_PAD_LEFT') + ':' + str_pad(parseInt(minutes).toString(), 2, '0', 'STR_PAD_LEFT');
  } else {
    return str_pad(parseInt(hours).toString(), 2, '0', 'STR_PAD_LEFT') + ':' + str_pad(parseInt(minutes).toString(), 2, '0', 'STR_PAD_LEFT') + ':' + str_pad(parseInt(seconds).toString(), 2, '0', 'STR_PAD_LEFT');
  }
}


/**
 * Convert human readable string into a time (microtime)
 *
 * @param   string  hour                human readable time
 * @return  int                         time in microseconds
 */
function hourToMs(hour)
{
  if (hour == '' || !hour.match(/[0-9]{2}:[0-9]{2}/)) {
    showError('Le temps doit être rempli sous la forme 00:00 !');
    return false;
  }
  
  hour = hour.split(':');
  var temps_in_ms = (parseInt(hour[0] * 60 * 60) + parseInt(hour[1] * 60)) * 1000;
  
  return temps_in_ms;
}


/**
 * Get the average speed
 */
function getMoyenneKmH(time, distance)
{
  return Math.round(((distance / 1000) / (time / (60 * 60 * 1000))) * 100) / 100 + 'Km/H';
}