/**
 * @summary     DataTables Editor
 * @description Table editing library for DataTables
 * @version     1.0.0
 * @file        dataTables.editor.js
 * @author      Allan Jardine (www.sprymedia.co.uk)
 * @contact     www.sprymedia.co.uk/contact
 * @license     DataTables Editor: http://editor.datatables.net/license
 */

/*jslint evil: true, undef: true, browser: true */
/*globals jQuery,alert,console */

(/** @lends <global> */function(window, document, undefined, $, DataTable) {

// Local variable for fast look up of the field type methods
var FieldTypes = {};

/** 
 * Editor is a plug-in for <a href="http://datatables.net">DataTables</a> which provides
 * an interface for creating, reading, editing and deleting and entries (a CRUD interface)
 * in a DataTable. The documentation presented here is primarily focused on presenting the
 * API for Editor. For a full list of features, examples and the server interface protocol,
 * please refer to the <a href="http://editor.datatables.net">Editor web-site</a>.
 *
 * Note that the <i>DataTable</i> object is not a global variable but is
 * aliased to <i>jQuery.fn.DataTable</i> and <i>jQuery.fn.dataTable</i> through which 
 * it may be  accessed. Therefore, when creating a new Editor instance, use 
 * <i>jQuery.fn.DataTable.Editor</i> as shown in the examples below.
 *
 *  @class
 *  @param {object} [oInit={}] Configuration object for Editor. Options
 *    are defined by {@link DataTable.Editor.defaults}. The options which must be set
 *    are <i>ajaxUrl</i> and <i>domTable</i>.
 *  @requires jQuery 1.3+ DataTables 1.9+
 * 
 *  @example
 *    // Basic initialisation - this example shows a table with 2 columns, each of which is editable
 *    // as a text input and provides add, edit and delete buttons by making use of TableTools
 *    // (Editor provides three buttons that extend the abilities of TableTools).
 *    $(document).ready(function() {
 *      var editor = new $.fn.DataTable.Editor( {
 *        "ajaxUrl": "php/index.php",
 *        "domTable": "#example",
 *        "fields": [ {
 *            "label": "Browser:",
 *            "name": "browser"
 *          }, {
 *            "label": "Rendering engine:",
 *            "name": "engine"
 *          }, {
 *            "label": "Platform:",
 *            "name": "platform"
 *          }, {
 *            "label": "Version:",
 *            "name": "version"
 *          }, {
 *            "label": "CSS grade:",
 *            "name": "grade"
 *          }
 *        ]
 *      } );

 *      $('#example').dataTable( {
 *        "sDom": "Tfrtip",
 *        "sAjaxSource": "php/index.php",
 *        "aoColumns": [
 *          { "mDataProp": "browser" },
 *          { "mDataProp": "engine" },
 *          { "mDataProp": "platform" },
 *          { "mDataProp": "version", "sClass": "center" },
 *          { "mDataProp": "grade", "sClass": "center" }
 *        ],
 *        "oTableTools": {
 *          "sRowSelect": "multi",
 *          "aButtons": [
 *            { "sExtends": "dtf_create", "dtf": editor },
 *            { "sExtends": "dtf_edit",   "dtf": editor },
 *            { "sExtends": "dtf_remove", "dtf": editor }
 *          ]
 *        }
 *      } );
 *    } );
 */
DataTable.Editor = function ( opts )
{
	if ( ! this instanceof DataTable.Editor ) {
		alert( "DataTables Editor must be initilaised as a 'new' instance'" );
	}

	this._constructor( opts );
};

/*
 * Models
 */

/**
 * Object models container, for the various models that DataTables has available
 * to it. These models define the objects that are used to hold the active state 
 * and configuration of the table.
 *  @namespace
 */
DataTable.Editor.models = {};


/**
 * Editor makes very few assumptions about how its form will actually be
 * displayed to the end user (where in the DOM, interaction etc), instead
 * focusing on providing form interaction controls only. To actually display
 * a form in the browser we need to use a display controller, and then select
 * which one we want to use at initialisation time using the <i>display</i>
 * option. For example a display controller could display the form in a
 * lightbox (as the default display controller does), it could completely
 * empty the document and put only the form in place, ir could work with
 * DataTables to use fnOpen / fnClose to show the form in a "details" row
 * and so on.
 *
 * Editor has two built-in display controllers ('lightbox' and 'envelope'),
 * but others can readily be created and installed for use as plug-ins. When
 * creating a display controller plug-in you <b>must</b> implement the methods
 * in this control. Additionally when closing the display internally you
 * <b>must</b> trigger a <i>requestClose</i> event which Editor will listen
 * for and act upon (this allows Editor to ask the user if they are sure
 * they want to close the form, for example).
 *  @namespace
 */
DataTable.Editor.models.displayController = {
	/**
	 * Initialisation method, called by Editor when itself, initialises.
	 *  @param {object} dte The DataTables Editor instance that has requested
	 *    the action - this allows access to the Editor API if required.
	 *  @returns {object} The object that Editor will use to run the 'open'
	 *    and 'close' methods against. If static methods are used then
	 *    just return the object that holds the init, open and close methods,
	 *    however, this allows the display to be created with a 'new'
	 *    instance of an object is the display controller calls for that.
	 *  @type function
	 */
	"init": function ( dte ) {},

	/**
	 * Display the form (add it to the visual display in the document)
	 *  @param {object} dte The DataTables Editor instance that has requested
	 *    the action - this allows access to the Editor API if required.
	 *  @param {element} append The DOM node that contains the form to be
	 *    displayed
	 *  @param {function} [fn] Callback function that is to be executed when
	 *    the form has been displayed. Note that this parameter is optional.
	 */
	"open": function ( dte, append, fn ) {},

	/**
	 * Hide the form (remove it form the visual display in the document)
	 *  @param {object} dte The DataTables Editor instance that has requested
	 *    the action - this allows access to the Editor API if required.
	 *  @param {function} [fn] Callback function that is to be executed when
	 *    the form has been hidden. Note that this parameter is optional.
	 */
	"close": function ( dte, fn ) {}
};




/**
 * Object structure used to define a field (a user input control) in a form. The options
 * shown here can provided to customise the field as required. All properties are
 * optional with the exception of the 'name' property which much be defined.
 *  @namespace
 */
DataTable.Editor.models.field = {
	/**
	 * The name for the field that is submitted to the server. This is the only
	 * mandatory parameter in the field description object.
	 *  @type string
	 *  @default <i>null</i>
	 */
	"name": null,
	
	/**
	 * The data property (<i>mDataProp</i> in DataTables terminology) that is used 
	 * to read from and write to the table. If not given then it will take the same 
	 * value as the 'name' that is given in the field object. Note that dataProp
	 * can be given as null, which will result in Editor not using a DataTables row
	 * property for the value of the field for either getting or setting data.
	 *  @type string
	 *  @default <i>Empty string</i>
	 */
	"dataProp": "",

	/**
	 * The label to display for the field input (i.e. the name that is visually 
	 * assigned to the field).
	 *  @type string
	 *  @default <i>Empty string</i>
	 */
	"label": "",

	/**
	 * The ID of the field. This is used by the 'label' tag as the "for" attribute 
	 * improved accessibility. Although this using this parameter is not mandatory,
	 * it is a good idea to assign the ID to the DOM element that is the input for the
	 * field (if this is applicable).
	 *  @type string
	 *  @default <i>Calculated</i>
	 */
	"id": "",

	/**
	 * The input control that is presented to the end user. The options available 
	 * are defined by {@link DataTable.Editor.fieldTypes} and any extensions made 
	 * to that object.
	 *  @type string
	 *  @default text
	 */
	"type": "text",

	/**
	 * Helpful information text about the field that is shown below the input control.
	 *  @type string
	 *  @default <i>Empty string</i>
	 */
	"fieldInfo": "",

	/**
	 * Helpful information text about the field that is shown below the field label.
	 *  @type string
	 *  @default <i>Empty string</i>
	 */
	"labelInfo": "",

	/**
	 * The default value for the field. Used when creating new rows (editing will
	 * use the currently set value).
	 *  @type string
	 *  @default <i>Empty string</i>
	 */
	"default": "",


	/**
	 * The field wrapper element
	 *  @type node
	 *  @default null
	 *  @private
	 */
	"_wrapper": null,

	/**
	 * Cached field message element
	 *  @type node
	 *  @default null
	 *  @private
	 */
	"_fieldMessage": null,

	/**
	 * Cached field information element
	 *  @type node
	 *  @default null
	 *  @private
	 */
	"_fieldInfo": null,

	/**
	 * Cached field error element
	 *  @type node
	 *  @default null
	 *  @private
	 */
	"_fieldError": null,

	/**
	 * Cached label info element
	 *  @type node
	 *  @default null
	 *  @private
	 */
	"_labelInfo": null
};



/**
 * Model object for input types which are available to fields (assigned to
 * {@link DataTable.Editor.fieldTypes}). Any plug-ins which add additional
 * input types to Editor <b>must</b> implement the methods in this object 
 * (dummy functions are given in the model so they can be used as defaults
 * if extending this object).
 *
 * All functions in the model are executed in the Editor's instance scope,
 * so you have full access to the settings object and the API methods if
 * required.
 *  @namespace
 *  @example
 *    // Add a simple text input (the 'text' type that is built into Editor
 *    // does this, so you wouldn't implement this exactly as show, but it
 *    // it is a good example.
 *
 *    var Editor = $.fn.DataTable.Editor;
 *
 *    Editor.fieldTypes.myInput = $.extend( true, {}, Editor.models.type, {
 *      "create": function ( conf ) {
 *        // We store the 'input' element in the configuration object so
 *        // we can easily access it again in future.
 *        conf._input = document.createElement('input');
 *        conf._input.id = conf.id;
 *        return conf._input;
 *      },
 *    
 *      "get": function ( conf ) {
 *        return conf._input.value;
 *      },
 *    
 *      "set": function ( conf, val ) {
 *        conf._input.value = val;
 *      },
 *    
 *      "enable": function ( conf ) {
 *        conf._input.disabled = false;
 *      },
 *    
 *      "disable": function ( conf ) {
 *        conf._input.disabled = true;
 *      }
 *    } );
 */
DataTable.Editor.models.fieldType = {
	/**
	 * Create the field - this is called when the field is added to the form.
	 * Note that this is at initialisation time, or when the <i>add</i> API
	 * method is called, not when the form is displayed. If you need to know
	 * when the form is shown, you can use the API to listen for the 'onOpen'
	 * event.
	 *  @param {object} conf The configuration object for the field in question:
	 *    {@link DataTable.Editor.models.field}.
	 *  @returns {element|null} The input element (or a wrapping element if a more
	 *    complex input is required) or null if nothing is to be added to the
	 *    DOM for this input type.
	 *  @type function
	 */
	"create": function ( conf ) {},

	/**
	 * Get the value from the field
	 *  @param {object} conf The configuration object for the field in question:
	 *    {@link DataTable.Editor.models.field}.
	 *  @returns {*} The value from the field - the exact value will depend on the
	 *    formatting required by the input type control.
	 *  @type function
	 */
	"get": function ( conf ) {},

	/**
	 * Set the value for a field
	 *  @param {object} conf The configuration object for the field in question:
	 *    {@link DataTable.Editor.models.field}.
	 *  @param {*} val The value to set the field to - the exact value will
	 *    depend on the formatting required by the input type control.
	 *  @type function
	 */
	"set": function ( conf, val ) {},

	/**
	 * Enable the field - i.e. allow user interface
	 *  @param {object} conf The configuration object for the field in question:
	 *    {@link DataTable.Editor.models.field}.
	 *  @type function
	 */
	"enable": function ( conf ) {},

	/**
	 * Disable the field - i.e. disallow user interface
	 *  @param {object} conf The configuration object for the field in question:
	 *    {@link DataTable.Editor.models.field}.
	 *  @type function
	 */
	"disable": function ( conf ) {}
};



/**
 * Settings object for Editor - this provides the state for each instance of
 * Editor and can be accessed through the <i>s</i> property. Note that the
 * settings object is considered to be "private" and thus is liable to change
 * between versions. As such if you do read any of the setting parameters,
 * please keep this in mind when upgrading!
 *  @namespace
 */
DataTable.Editor.models.settings = {
	/**
	 * URL to submit Ajax data to.
	 * This is directly set by the initialisation parameter of the same name.
	 * This is directly set by the initialisation parameter / default of the same name.
	 *  @type string
	 *  @default null
	 */
	"ajaxUrl": "",

	/**
	 * Ajax submit function.
	 * This is directly set by the initialisation parameter / default of the same name.
	 *  @type function
	 *  @default null
	 */
	"ajax": null,

	/**
	 * URL to submit Ajax data to.
	 * This is directly set by the initialisation parameter / default of the same name.
	 *  @type string
	 *  @default null
	 */
	"domTable": null,
	
	/**
	 * Name of the database table that is to be operated on - passed to the server in the
	 * Ajax request.
	 * This is directly set by the initialisation parameter / default of the same name.
	 *  @type string
	 *  @default null
	 */
	"dbTable": "",
	
	/**
	 * The initialisation object that was given by the user - stored for future reference.
	 * This is directly set by the initialisation parameter / default of the same name.
	 *  @type string
	 *  @default null
	 */
	"opts": null,
	
	/**
	 * The display controller object for the Form.
	 * This is directly set by the initialisation parameter / default of the same name.
	 *  @type string
	 *  @default null
	 */
	"displayController": null,
	
	/**
	 * The form fields - see {@link DataTable.Editor.models.field} for details of the 
	 * objects held in this array.
	 *  @type string
	 *  @default null
	 */
	"fields": [],

	/**
	 * The ID of the row being edited (set to -1 on create and remove actions)
	 *  @type string
	 *  @default null
	 */
	"id": -1,
	
	/**
	 * Flag to indicate if the form is currently displayed (true) or not (false)
	 *  @type string
	 *  @default null
	 */
	"displayed": false,
	
	/**
	 * Flag to indicate if the form is current in a processing state (true) or not (false)
	 *  @type string
	 *  @default null
	 */
	"processing": false,
	
	/**
	 * The TR element that is being edited (set to null for create and remove actions)
	 *  @type string
	 *  @default null
	 */
	"editRow": null,
	
	/**
	 * An array of TR elements that are scheduled to be removed on delete (set to null
	 * on create and edit actions).
	 *  @type array
	 *  @default null
	 */
	"removeRows": null,
	
	/**
	 * The current form action - 'create', 'edit' or 'remove'. If no current action then
	 * it is set to null.
	 *  @type string
	 *  @default null
	 */
	"action": null,

	/**
	 * Arrays that contain the callback functions which are registered with
	 * Editor. For full details see: {@link DataTable.Editor.defaults} (note
	 * that the arrays do not have the 'on' prefix of the callback / events.
	 *  @namespace
	 */
	"events": {
		"processing": [],
		"open": [],
		"close": [],
		"presubmit": [],
		"submitLoaded": [],
		"submitComplete": [],
		"submitSuccess": [],
		"submitError": [],
		"create": [],
		"precreate": [],
		"edit": [],
		"preedit": [],
		"remove": [],
		"preremove": [],
		"setData": [],
		"initComplete": []
	}
};



/**
 * Model of the buttons that can be used with the {@link DataTable.Editor#buttons}
 * method for creating and displaying buttons (also the <i>button</i> argument option
 * for the <i>create</i>, <i>edit</i> and <i>remove</i> methods). Although you don't
 * need to extend this object, it is available for reference to show the options 
 * available.
 *  @namespace
 */
DataTable.Editor.models.button = {
	/**
	 * The text to put into the button. This can be any HTML string you wish as 
	 * it will be rendered as HTML (allowing images etc to be shown inside the
	 * button).
	 *  @type string
	 *  @default null
	 */
	"label": null,

	/**
	 * Callback function which the button is activated. For example for a 'submit' 
	 * button you would call the <i>submit</i> API method, while for a cancel button
	 * you would call the <i>close</i> API method. Note that the function is executed 
	 * in the scope of the Editor instance, so you can call the Editor's API methods 
	 * using the 'this' keyword.
	 *  @type function
	 *  @default null
	 */
	"fn": null,
	
	/**
	 * The CSS class(es) to apply to the button which can be useful for styling buttons 
	 * which preform different functions each with a distinctive visual appearance.
	 *  @type string
	 *  @default null
	 */
	"className": null
};


/*
 * Display controllers
 */

/**
 * Display controllers. See {@link DataTable.Editor.models.displayController} for
 * full information about the display controller options for Editor. The display
 * controllers given in this object can be utilised by specifying the
 * {@link DataTable.Editor.defaults.display} option.
 *  @namespace
 */
DataTable.Editor.display = {};


(function(window, document, $, DataTable) {


var self;

DataTable.Editor.display.lightbox = $.extend( true, {}, DataTable.Editor.models.displayController, {
	/*
	 * API methods
	 */
	"init": function ( dte ) {
		self._init();
		return self;
	},

	"open": function ( dte, append, callback ) {
		self._dte = dte;
		$(self._dom.content).children().detach();
		self._dom.content.appendChild( append );
		self._dom.content.appendChild( self._dom.close );

		self._show( callback );
	},

	"close": function ( dte, callback ) {
		self._dte = dte;
		self._hide( callback );
	},


	/*
	 * Private methods
	 */
	"_init": function () {
		if ( self._ready ) {
			return;
		}

		self._dom.content = $('div.DTED_Lightbox_Content', self._dom.wrapper)[0];

		document.body.appendChild( self._dom.background );
		document.body.appendChild( self._dom.wrapper );

		// For IE6-8 we need to make it a block element to read the opacity...
		self._dom.background.style.visbility = 'hidden';
		self._dom.background.style.display = 'block';
		self._cssBackgroundOpacity = $(self._dom.background).css('opacity');
		self._dom.background.style.display = 'none';
		self._dom.background.style.visbility = 'visible';

		$(self._dom.close).click( function (e) {
			self._dte.close('icon');
		} );

		$(self._dom.background).click( function (e) {
			self._dte.close('background');
		} );

		$('div.DTED_Lightbox_Content_Wrapper', self._dom.wrapper).click( function (e) {
			if ( $(e.target).hasClass('DTED_Lightbox_Content_Wrapper') ) {
				self._dte.close('background');
			}
		} );

		// Window resize event handlers
		$(window).resize( function () {
			self._heightCalc();
		} );
	},
	

	"_show": function ( callback ) {
		var that = this;
		var formHeight;

		if ( !callback ) {
			callback = function () {};
		}

		// Adjust size for the content
		self._dom.content.style.height = 'auto';

		var style = self._dom.wrapper.style;
		style.opacity = 0;
		style.display = 'block';

		self._heightCalc();

		style.display = 'none';
		style.opacity = 1;

		$(self._dom.wrapper).fadeIn();

		self._dom.background.style.opacity = 0;
		self._dom.background.style.display = 'block';
		$(self._dom.background).animate( {
			'opacity': self._cssBackgroundOpacity
		}, 'normal', callback );
	},


	"_heightCalc": function () {
		var formHeight;

		formHeight = self.conf.heightCalc ? 
			self.conf.heightCalc( self._dom.wrapper ) :
			$(self._dom.content).children().height();

		// Set the max-height for the form content
		var maxHeight = $(window).height() - (self.conf.windowPadding*2) - 
			$('div.DTE_Header', self._dom.wrapper).outerHeight() - 
			$('div.DTE_Footer', self._dom.wrapper).outerHeight();

		$('div.DTE_Body_Content', self._dom.wrapper).css('maxHeight', maxHeight);
	},


	"_hide": function ( callback ) {
		if ( !callback ) {
			callback = function () {};
		}

		$([self._dom.wrapper, self._dom.background]).fadeOut( 'normal', callback );
	},


	/*
	 * Private properties
	 */
	"_dte": null,
	"_ready": false,
	"_cssBackgroundOpacity": 1, // read from the CSS dynamically, but stored for future reference

	"_dom": {
		"wrapper": $(
			'<div class="DTED_Lightbox_Wrapper">'+
				'<div class="DTED_Lightbox_Container">'+
					'<div class="DTED_Lightbox_Content_Wrapper">'+
						'<div class="DTED_Lightbox_Content">'+
						'</div>'+
					'</div>'+
				'</div>'+
			'</div>'
		)[0],

		"background": $(
			'<div class="DTED_Lightbox_Background"></div>'
		)[0],

		"close": $(
			'<div class="DTED_Lightbox_Close"></div>'
		)[0],

		"content": null
	}
} );

self = DataTable.Editor.display.lightbox;

self.conf = {
	"windowPadding": 100,
	"heightCalc": null
};


}(window, document, jQuery, jQuery.fn.dataTable));



(function(window, document, $, DataTable) {


var self;

DataTable.Editor.display.envelope = $.extend( true, {}, DataTable.Editor.models.displayController, {
	/*
	 * API methods
	 */
	"init": function ( dte ) {
		self._init();
		return self;
	},


	"open": function ( dte, append, callback ) {
		self._dte = dte;
		$(self._dom.content).children().detach();
		self._dom.content.appendChild( append );
		self._dom.content.appendChild( self._dom.close );

		self._show( callback );
	},


	"close": function ( dte, callback ) {
		self._dte = dte;
		self._hide( callback );
	},


	/*
	 * Private methods
	 */
	"_init": function () {
		if ( self._ready ) {
			return;
		}

		self._dom.content = $('div.DTED_Envelope_Container', self._dom.wrapper)[0];

		document.body.appendChild( self._dom.background );
		document.body.appendChild( self._dom.wrapper );

		// For IE6-8 we need to make it a block element to read the opacity...
		self._dom.background.style.visbility = 'hidden';
		self._dom.background.style.display = 'block';
		self._cssBackgroundOpacity = $(self._dom.background).css('opacity');
		self._dom.background.style.display = 'none';
		self._dom.background.style.visbility = 'visible';

		$(self._dom.close).click( function (e) {
			self._dte.close('icon');
		} );

		$(self._dom.background).click( function (e) {
			self._dte.close('background');
		} );

		$('div.DTED_Envelope_Content_Wrapper', self._dom.wrapper).click( function (e) {
			if ( $(e.target).hasClass('DTED_Envelope_Content_Wrapper') ) {
				self._dte.close('background');
			}
		} );

		// Window resize event handlers
		$(window).resize( function () {
			self._heightCalc();
		} );
	},


	"_show": function ( callback ) {
		var that = this;
		var formHeight;

		if ( !callback ) {
			callback = function () {};
		}

		// Adjust size for the content
		self._dom.content.style.height = 'auto';

		var style = self._dom.wrapper.style;
		style.opacity = 0;
		style.display = 'block';

		var targetRow = self._findAttachRow();
		var height = self._heightCalc();
		var width = targetRow.offsetWidth;

		style.display = 'none';
		style.opacity = 1;

		// Prep the display
		self._dom.wrapper.style.width = width+"px";
		self._dom.wrapper.style.marginLeft = -(width/2)+"px";
		self._dom.wrapper.style.top = ($(targetRow).offset().top + targetRow.offsetHeight)+"px";
		self._dom.content.style.top = ((-1 * height) - 20)+"px";

		// Start animating in the background
		self._dom.background.style.opacity = 0;
		self._dom.background.style.display = 'block';
		$(self._dom.background).animate( {
			'opacity': self._cssBackgroundOpacity
		}, 'normal' );

		// Animate in the display
		$(self._dom.wrapper).fadeIn();

		// Slide the slider down to 'open' the view
		if ( self.conf.windowScroll ) {
			// Scroll the window so we can see the editor first
			$('html,body').animate( {
				"scrollTop": $(targetRow).offset().top + targetRow.offsetHeight - self.conf.windowPadding
			}, function () {
				// Now open the editor
				$(self._dom.content).animate( {
					"top": 0
				}, 600, callback );
			} );
		}
		else {
			// Just open the editor without moving the document position
			$(self._dom.content).animate( {
				"top": 0
			}, 600, callback );
		}
	},


	"_heightCalc": function () {
		var formHeight;

		formHeight = self.conf.heightCalc ? 
			self.conf.heightCalc( self._dom.wrapper ) :
			$(self._dom.content).children().height();

		// Set the max-height for the form content
		var maxHeight = $(window).height() - (self.conf.windowPadding*2) - 
			$('div.DTE_Header', self._dom.wrapper).outerHeight() - 
			$('div.DTE_Footer', self._dom.wrapper).outerHeight();

		$('div.DTE_Body_Content', self._dom.wrapper).css('maxHeight', maxHeight);

		return $(self._dte.dom.wrapper).outerHeight();
	},


	"_hide": function ( callback ) {
		if ( !callback ) {
			callback = function () {};
		}

		$(self._dom.content).animate( {
			"top": -(self._dom.content.offsetHeight+50)
		}, 600, function () {
			$([self._dom.wrapper, self._dom.background]).fadeOut( 'normal', callback );
		} );
	},


	"_findAttachRow": function () {
		// Figure out where we want to put the form display
		if ( self.conf.attach === 'head' ) {
			return $(self._dte.s.domTable).dataTable().fnSettings().nTHead;
		}
		else if ( self._dte.s.action === 'create' ) {
			return $(self._dte.s.domTable).dataTable().fnSettings().nTHead;
		}
		else if ( self._dte.s.action === 'edit' ) {
			return self._dte.s.editRow;
		}
		else if ( self._dte.s.action === 'remove' ) {
			return self._dte.s.removeRows[0];
		}
	},


	/*
	 * Private properties
	 */
	"_dte": null,
	"_ready": false,
	"_cssBackgroundOpacity": 1, // read from the CSS dynamically, but stored for future reference


	"_dom": {
		"wrapper": $(
			'<div class="DTED_Envelope_Wrapper">'+
				'<div class="DTED_Envelope_ShadowLeft"></div>'+
				'<div class="DTED_Envelope_ShadowRight"></div>'+
				'<div class="DTED_Envelope_Container"></div>'+
			'</div>'
		)[0],

		"background": $(
			'<div class="DTED_Envelope_Background"></div>'
		)[0],

		"close": $(
			'<div class="DTED_Envelope_Close">x</div>'
		)[0],

		"content": null
	}
} );


// Assign to 'self' for easy referencing of our own object!
self = DataTable.Editor.display.envelope;


// Configuration object - can be accessed globally using 
// $.fn.DataTable.Editor.display.envelope.conf (!)
self.conf = {
	"windowPadding": 50,
	"heightCalc": null,
	"attach": "row",
	"windowScroll": true
};


}(window, document, jQuery, jQuery.fn.dataTable));


/*
 * Prototype includes
 */


/**
 * Add a new field to the from. This is the method that is called automatically when
 * fields are given in the initialisation objects as <i>fields</i>.
 *  @param {object|array} field The object that describes the field (the full object is
 *    described by {@link DataTable.Editor.model.field}. Note that multiple fields can
 *    be given by passing in an array of field definitions.
 *  @param {string} field.name The name for the field that is submitted to the server.
 *    This is the only mandatory parameter in the field description object.
 *  @param {string} [field.dataProp] The data property (<i>mDataProp</i> in DataTables
 *    terminology) that is used to read from and write to the table. If not given then
 *    it will take the same value as the 'name' that is given in the field object.
 *  @param {string} [field.default] The default value to set the input to when using
 *    the 'create' option to add a new record.
 *  @param {string} [field.label] The label to display for the field input (i.e. the name
 *    that is visually assigned to the field).
 *  @param {string} [field.type] The input control that is presented to the end user. The
 *    options available are defined by {@link DataTable.Editor.fieldTypes} and any
 *    extensions made to that object.
 *  @param {string} [field.fieldInfo] Helpful information text about the field that is
 *    shown below the input control.
 *  @param {string} [field.labelInfo] Helpful information text about the field that is
 *    shown below the field label.
 * 
 *  @example
 *      // Add a single field to an Editor instance with basic name and label information
 *      var editor = new $.fn.DataTable.Editor( {
 *        "ajaxUrl": "php/index.php",
 *        "domTable": "#example"
 *      } );
 *      
 *      editor.add( {
 *        "label": "Name:",
 *        "name": "name"
 *      } );
 * 
 *  @example
 *      // Add a field to an existing Editor instance with extra information
 *      editor.add( {
 *        "label": "Name:",
 *        "name": "name",
 *        "dataProp": "user_name",
 *        "fieldInfo": "Enter the system user name (first name + last name)"
 *      } );
 */
DataTable.Editor.prototype.add = function ( field )
{
	// Allow multiple fields to be added at the same time
	if ( $.isArray( field ) ) {
		for ( var i=0, iLen=field.length ; i<iLen ; i++ ) {
			this.add( field[i] );
		}
		return;
	}

	field = $.extend( true, {}, DataTable.Editor.models.field, field );
	field.id = "DTE_Field_"+field.name;

	// If no dataProp is given, then we use the name from the field as the data prop
	// to read data for the field from DataTables
	if ( field.dataProp === "" ) {
		field.dataProp = field.name;
	}

	var template = $(
		'<div class="DTE_Field DTE_Field_Type_'+field.type+' DTE_Field_Name_'+field.name+'">'+
			'<label class="DTE_Label" for="'+field.id+'">'+
				field.label+
				'<div class="DTE_Label_Info">'+field.labelInfo+'</div>'+
			'</label>'+
			'<div class="DTE_Field_Input">'+
				'<div class="DTE_Field_Error"></div>'+
				'<div class="DTE_Field_Message"></div>'+
				'<div class="DTE_Field_Info">'+field.fieldInfo+'</div>'+
			'</div>'+
		'</div>')[0];
	
	var input = FieldTypes[ field.type ].create.call( this, field );
	if ( input !== null ) {
		$('div.DTE_Field_Input', template).prepend( input );
	}
	else {
		template.style.display = "none";
	}
	
	this.dom.formContent.appendChild( template );
	this.dom.formContent.appendChild( this.dom.formClear );

	field._wrapper = template;
	field._fieldError = $('div.DTE_Field_Error', template)[0];
	field._fieldMessage = $('div.DTE_Field_Message', template)[0];
	field._fieldInfo = $('div.DTE_Field_Info', template)[0];
	field._labelInfo = $('div.DTE_Label_Info', template)[0];
	this.s.fields.push( field );
};


/**
 * Setup the buttons that will be shown in the footer of the form - calling this
 * method will replace any buttons which are currently shown in the form.
 *  @param {array|object} buttons A single button definition to add to the form or
 *    an array of objects with the button definitions to add more than one button.
 *    The options for the button definitions are fully defined by the
 *    {@link DataTable.Editor.button} object.
 *  @param {string} buttons.label The text to put into the button. This can be any
 *    HTML string you wish as it will be rendered as HTML (allowing images etc to 
 *    be shown inside the button).
 *  @param {function} [buttons.fn] Callback function which the button is activated.
 *    For example for a 'submit' button you would call the <i>submit</i> API method,
 *    while for a cancel button you would call the <i>close</i> API method. Note that
 *    the function is executed in the scope of the Editor instance, so you can call
 *    the Editor's API methods using the 'this' keyword.
 *  @param {string} [buttons.className] The CSS class(es) to apply to the button
 *    which can be useful for styling buttons which preform different functions
 *    each with a distinctive visual appearance.
 * 
 *  @example
 *      // Create an editor instance and then setup a submit button
 *      var editor = new $.fn.DataTable.Editor( {
 *        "ajaxUrl": "php/index.php",
 *        "domTable": "#example"
 *      } );
 *      
 *      editor.buttons( {
 *        "label": "Submit",
 *        "fn": function () {
 *          this.submit();
 *        }
 *      } );
 *      
 *  @example
 *      // Put save (submit) and cancel buttons onto a pre-existing editor instance
 *      editor.buttons( [
 *        {
 *          "label": "Cancel",
 *          "fn": function () {
 *            this.close();
 *          }
 *        }, {
 *          "label": "Save",
 *          "fn": function () {
 *            this.submit();
 *          }
 *        }
 *      ] );
 */
DataTable.Editor.prototype.buttons = function ( buttons )
{
	var that = this;
	var i, iLen, button;

	// Allow a single button to be passed in as an object with an array
	if ( !$.isArray( buttons ) ) {
		this.buttons( [ buttons] );
		return;
	}

	$(this.dom.buttons).empty();

	var buttonClick = function( button ) {
		return function (e) {
			e.preventDefault();
			if ( button.fn ) {
				button.fn.call( that );
			}
		};
	};
	for ( i=0, iLen=buttons.length ; i<iLen ; i++ ) {
		button = document.createElement('button');
		if ( buttons[i].label ) {
			button.innerHTML = buttons[i].label;
		}
		if ( buttons[i].className ) {
			button.className = buttons[i].className;
		}

		$(button).click( buttonClick(buttons[i]) );

		this.dom.buttons.appendChild( button );
	}
};


/**
 * Remove fields from the form (fields are those that have been added using the
 * <i>add</i> API method or the <i>fields</i> initialisation option). A single,
 * multiple or all fields can be removed at a time based on the passed parameter.
 * Fields are identified by the <i>name</i> property that was given to each field
 * when added to the form.
 *  @param {string|array} [fieldName] Field or fields to remove from the form. If
 *    not given then all fields are removed from the form. If given as a string
 *    then the single matching field will be removed. If given as an array of
 *    strings, then all matching fields will be removed.
 *
 *  @example
 *    // Clear the form of current fields and then add a new field 
 *    // before displaying a 'create' display
 *    editor.clear();
 *    editor.add( {
 *      "label": "User name",
 *      "name": "username"
 *    } );
 *    editor.create( "Create user" );
 *
 *  @example
 *    // Remove an individual field
 *    editor.clear( "username" );
 *
 *  @example
 *    // Remove multiple fields
 *    editor.clear( [ "first_name", "last_name" ] );
 */
DataTable.Editor.prototype.clear = function ( fieldName )
{
	if ( !fieldName ) {
		// Empty the whole form
		$('div.DTE_Field', this.dom.wrapper).remove();
		this.s.fields.splice( 0, this.s.fields.length );
	}
	else if ( $.isArray( fieldName ) ) {
		for ( var i=0, iLen=fieldName.length ; i<iLen ; i++ ) {
			this.clear( fieldName[i] );
		}
	}
	else {
		// Remove an individual form element
		var fieldIndex = this._findFieldIndex( fieldName );
		if ( fieldIndex ) {
			$(this.s.fields[fieldIndex]._wrapper).remove();
			this.s.fields.splice( fieldIndex, 1 );
		}
	}
};


/**
 * Close the form display
 *  @param {string} [trigger] An identification string to indicate what called the
 *    close method. This is  entirely optional, but could be useful in the events /
 *    callback functions. For example the display controller will pass in either
 *    'background' or 'icon' to indicate if the close was triggered by a click on
 *    the background or the close icon.
 * 
 *  @example
 *      // Show the 'create' form with a cancel button that will call this
 *      // method when activated.
 *      editor.create( 'Add new record', [
 *        {
 *          "label": "Cancel",
 *          "fn": function () {
 *            this.close();
 *          }
 *        }, {
 *          "label": "Save",
 *          "fn": function () {
 *            this.submit();
 *          }
 *        }
 *      ] );
 */
DataTable.Editor.prototype.close = function ( trigger )
{
	var that = this;

	this._display('close', function () {
		that._clearDynamicInfo();
	} );
};


/**
 * Create a new record - show the form that allows the user to enter information for
 * a new row and then subsequently submit that data.
 *  @param {string} [title] The title to show in the form header
 *  @param {object|array} [buttons] The buttons to use in the display. If not given
 *    or null, then the buttons already setup for the form (using the <i>buttons</i>
 *    method) will be used
 *  @param {boolean} [show=true] Show the form or not. If false the form is not shown
 *    to the user, which can be useful when no confirmation is required for an action.
 * 
 *  @example
 *    // Show the create form with a submit button
 *    editor.create( 'Add new record', {
 *      "label": "Save",
 *      "fn": function () { this.submit(); }
 *    } );
 * 
 *  @example
 *    // Don't show the form and automatically submit it after programatically 
 *    // setting the values of fields (and using the field defaults)
 *    editor.create( null, null, false );
 *    editor.set( 'name', 'Test user' );
 *    editor.set( 'access', 'Read only' );
 *    editor.submit();
 */
DataTable.Editor.prototype.create = function ( title, buttons, show )
{
	var that = this;

	this.s.id = "";
	this.s.action = "create";
	this.dom.form.style.display = 'block';
	
	this._actionClass();
	if ( title ) {
		this.title( title );
	}
	if ( buttons ) {
		this.buttons( buttons );
	}

	// Set the default for the field
	for ( var i=0, iLen=this.s.fields.length ; i<iLen ; i++ ) {
		var field = this.s.fields[i];
		FieldTypes[ field.type ].set( field, field['default'] );
	}

	if ( show === undefined || show ) {
		this._display('open', function () {
			$('input:visible,select:visible,textarea:visible', that.dom.wrapper)[0].focus();
		} );
	}
};


/**
 * Disable one or more field inputs, disallowing subsequent user interaction with the 
 * fields until they are re-enabled.
 *  @param {string|array} name The field name (from the <i>name</i> parameter given when
 *   originally setting up the field) to disable, or an array of field names to disable
 *   multiple fields with a single call.
 * 
 *  @example
 *    // Show a 'create' record form, but with a field disabled
 *    editor.disable( 'account_type' );
 *    editor.create( 'Add new user', {
 *      "label": "Save",
 *      "fn": function () { this.submit(); }
 *    } );
 * 
 *  @example
 *    // Disable multiple fields by using an array of field names
 *    editor.disable( ['account_type', 'access_level'] );
 */
DataTable.Editor.prototype.disable = function ( name )
{
	if ( $.isArray( name ) ) {
		for ( var i=0, iLen=name.length ; i<iLen ; i++ ) {
			this.disable( name[i] );
		}
		return;
	}

	var field = this._findField( name );
	if ( field ) {
		FieldTypes[ field.type ].disable( field );
	}
};


/**
 * Edit a record - show the form, pre-populated with the data that is in the given 
 * DataTables row, that allows the user to enter information for the row to be modified
 * and then subsequently submit that data.
 *  @param {node} row The TR element from the DataTable that is to be edited
 *  @param {string} [title] The title to show in the form header
 *  @param {object|array} [buttons] The buttons to use in the display. If not given
 *    or null, then the buttons already setup for the form (using the <i>buttons</i>
 *    method) will be used
 *  @param {boolean} [show=true] Show the form or not. If false the form is not shown
 *    to the user, which can be useful when no confirmation is required for an action.
 * 
 *  @example
 *    // Show the edit form for the first row in the DataTable with a submit button
 *    editor.create( $('#example tbody tr:eq(0)')[0], 'Edit record', {
 *      "label": "Update",
 *      "fn": function () { this.submit(); }
 *    } );
 *
 *  @example
 *    // Use the title and buttons API methods to show an edit form (this provides
 *    // the same result as example above, but is a different way of achieving it
 *    editor.title( 'Edit record' );
 *    editor.buttons( {
 *      "label": "Update",
 *      "fn": function () { this.submit(); }
 *    } );
 *    editor.edit( $('#example tbody tr:eq(0)')[0] );
 * 
 *  @example
 *    // Automatically submit an edit without showing the user the form
 *    editor.edit( TRnode, null, null, false );
 *    editor.set( 'name', 'Updated name' );
 *    editor.set( 'access', 'Read only' );
 *    editor.submit();
 */
DataTable.Editor.prototype.edit = function ( row, title, buttons, show )
{
	var that = this;

	this.s.id = row.id;
	this.s.editRow = row;
	this.s.action = "edit";
	this.dom.form.style.display = 'block';

	this._actionClass();
	if ( title ) {
		this.title( title );
	}
	if ( buttons ) {
		this.buttons( buttons );
	}

	// fnGetData on the table
	var data = $(this.s.domTable).dataTable()._(row)[0];

	for ( var i=0, iLen=this.s.fields.length ; i<iLen ; i++ ) {
		var field = this.s.fields[i];

		if ( field.dataProp !== "" ) {
			FieldTypes[ field.type ].set(
				field, 
				data[ field.dataProp ]
			);
		}
		else {
			FieldTypes[ field.type ].set( field, field['default'] );
		}
	}

	if ( show === undefined || show ) {
		this._display('open', function () {
			$('input:visible,select:visible,textarea:visible', that.dom.wrapper)[0].focus();
		} );
	}
};


/**
 * Enable one or more field inputs, restoring user interaction with the fields.
 *  @param {string|array} name The field name (from the <i>name</i> parameter given when
 *   originally setting up the field) to enable, or an array of field names to enable
 *   multiple fields with a single call.
 * 
 *  @example
 *    // Show a 'create' form with buttons which will enable and disable certain fields
 *    editor.create( 'Add new user', [
 *      {
 *        "label": "User name only",
 *        "fn": function () {
 *          this.enable('username');
 *          this.disable( ['first_name', 'last_name'] );
 *        }
 *      }, {
 *        "label": "Name based",
 *        "fn": function () {
 *          this.disable('username');
 *          this.enable( ['first_name', 'last_name'] );
 *        }
 *      }, {
 *        "label": "Submit",
 *        "fn": function () { this.submit(); }
 *      }
 *    );
 */
DataTable.Editor.prototype.enable = function ( name )
{
	if ( $.isArray( name ) ) {
		for ( var i=0, iLen=name.length ; i<iLen ; i++ ) {
			this.enable( name[i] );
		}
		return;
	}

	var field = this._findField( name );
	if ( field ) {
		FieldTypes[ field.type ].enable( field );
	}
};


/**
 * Show that a field, or the form globally, is in an error state. Note that
 * errors are cleared on each submission of the form.
 *  @param {string} [name] The name of the field that is in error. If not
 *    given then the global form error display is used.
 *  @param {string} msg The error message to show
 * 
 *  @example
 *    // Show an error if the field is required
 *    editor.create( 'Add new user', {
 *      "label": "Submit",
 *      "fn": function () {
 *        if ( this.get('username') === '' ) {
 *          this.error( 'username', 'A user name is required' );
 *          return;
 *        }
 *        this.submit();
 *      }
 *    } );
 * 
 *  @example
 *    // Show a field and a global error for a required field
 *    editor.create( 'Add new user', {
 *      "label": "Submit",
 *      "fn": function () {
 *        if ( this.get('username') === '' ) {
 *          this.error( 'username', 'A user name is required' );
 *          this.error( 'The data could not be saved because it is incomplete' );
 *          return;
 *        }
 *        this.submit();
 *      }
 *    } );
 */
DataTable.Editor.prototype.error = function ( name, msg )
{
	if ( !msg ) {
		msg = name;
		this._message( this.dom.formError, 'fade', msg );
	}
	else {
		var field = this._findField( name );
		if ( field ) {
			this._message( field._fieldError, 'slide', msg );
			$(field._wrapper).addClass('DTE_Field_StateError');
		}
	}
};


/**
 * Get the value of a field
 *  @param {string} name The field name (from the <i>name</i> parameter given when
 *   originally setting up the field) to disable.
 * 
 *  @example
 *    // Client-side validation - check that a field has been given a value 
 *    // before submitting the form
 *    editor.create( 'Add new user', {
 *      "label": "Submit",
 *      "fn": function () {
 *        if ( this.get('username') === '' ) {
 *          this.error( 'username', 'A user name is required' );
 *          return;
 *        }
 *        this.submit();
 *      }
 *    } );
 */
DataTable.Editor.prototype.get = function ( name )
{
	var field = this._findField( name );
	if ( field ) {
		return FieldTypes[ field.type ].get( field );
	}
	return undefined;
};


/**
 * Remove a field from the form display. Note that the field will still be submitted
 * with the other fields in the form, but it simply won't be visible to the user.
 *  @param {string|array} [name] The field name (from the <i>name</i> parameter given when
 *   originally setting up the field) to hide or an array of names. If not given then all 
 *   fields are hidden.
 * 
 *  @example
 *    // Show a 'create' record form, but with some fields hidden
 *    editor.hide( 'account_type' );
 *    editor.hide( 'access_level' );
 *    editor.create( 'Add new user', {
 *      "label": "Save",
 *      "fn": function () { this.submit(); }
 *    } );
 *
 *  @example
 *    // Show a single field by hiding all and then showing one
 *    editor.hide();
 *    editor.show('access_type');
 */
DataTable.Editor.prototype.hide = function ( name )
{
	var i, iLen;

	if ( !name ) {
		for ( i=0, iLen=this.s.fields.length ; i<iLen ; i++ ) {
			this.hide( this.s.fields[i].name );
		}
	}
	else if ( $.isArray(name) ) {
		for ( i=0, iLen=name.length ; i<iLen ; i++ ) {
			this.hide( name[i] );
		}
	}
	else {
		var field = this._findField( name );
		if ( field ) {
			if ( this.s.displayed ) {
				$(field._wrapper).slideUp();
			}
			else {
				field._wrapper.style.display = "none";
			}
		}
	}
};


/**
 * Show an information message for the form as a whole, or for an individual
 * field. This can be used to provide helpful information to a user about an
 * individual field, or more typically the form (for example when deleting
 * a record and asking for confirmation).
 *  @param {string} [name] The name of the field to show the message for. If not
 *    given then a global message is shown for the form
 *  @param {string} msg The message to show
 * 
 *  @example
 *    // Show a global message for a 'create' form
 *    editor.message( 'Add a new user to the database by completing the fields below' );
 *    editor.create( 'Add new user', {
 *      "label": "Submit",
 *      "fn": function () { this.submit(); }
 *    } );
 * 
 *  @example
 *    // Show a message for an individual field when a 'help' icon is clicked on
 *    $('#user_help').click( function () {
 *      editor.message( 'user', 'The user name is what the system user will login with' );
 *    } );
 */
DataTable.Editor.prototype.message = function ( name, msg )
{
	if ( !msg ) {
		msg = name;
		this._message( this.dom.formInfo, 'fade', msg );
	}
	else {
		var field = this._findField( name );
		this._message( field._fieldMessage, 'slide', msg );
	}
};


/**
 * Remove a bound event listener to the editor instance. This method provides a 
 * shorthand way of binding jQuery events that would be the same as writing 
 * $(editor).off(...) for convenience. Note that also the jQuery 1.7+ method of
 * 'off' is used for this method, it will also work with older versions of
 * jQuery, where it will use 'unbind'.
 *  @param {string} name Event name to remove the listeners for - event names are
 *    defined by the event object in the initialisation object:
 *    {@link DataTable.Editor.model.init}.
 *  @param {function} [fn] The function to remove. If not given, all functions which
 *    are assigned to the given event name will be removed.
 *
 *  @example
 *    // Add an event to alert when the form is shown and then remove the listener
 *    // so it will only fire once
 *    editor.on( 'onOpen', function () {
 *      alert('Form displayed!');
 *      editor.off( 'onOpen' );
 *    } );
 */
DataTable.Editor.prototype.off = function ( name, fn )
{
	if ( typeof $().off === 'function' ) {
		$(this).off( name, fn );
	}
	else {
		$(this).unbind( name, fn );
	}
};


/**
 * Listen for an event which is fired off by Editor when it performs certain actions.
 * This method provides a shorthand way of binding jQuery events that would be the 
 * same as writing   $(editor).on(...) for convenience. Note that also the jQuery 1.7+ 
 * method of 'on' is used for this method, it will also work with older versions of
 * jQuery, where it will use 'bind'.
 *  @param {string} name Event name to add the listener for - event names are
 *    defined by the event object in the initialisation object:
 *    {@link DataTable.Editor.model.init}.
 *  @param {function} fn The function to run when the event is triggered.
 *
 *  @example
 *    // Log events on the console when they occur
 *    editor.on( 'onOpen', function () { console.log( 'Form opened' ); } );
 *    editor.on( 'onClose', function () { console.log( 'Form closed' ); } );
 *    editor.on( 'onSubmit', function () { console.log( 'Form submitted' ); } );
 */
DataTable.Editor.prototype.on = function ( name, fn )
{
	if ( typeof $().on === 'function' ) {
		$(this).on( name, fn );
	}
	else {
		$(this).bind( name, fn );
	}
};


/**
 * Display the form to the end user in the web-browser
 * 
 *  @example
 *    // Build a 'create' form, but don't display it until some values have
 *    // been set. When done, then display the form.
 *    editor.create( 'Create user', {
 *      "label": "Submit",
 *      "fn": function () { this.submit(); }
 *    }, false );
 *    editor.set( 'name', 'Test user' );
 *    editor.set( 'access', 'Read only' );
 *    editor.open();
 */
DataTable.Editor.prototype.open = function ()
{
	this._display('open');
};


/**
 * Remove (delete) entries from the table. The rows to remove are given as either a
 * single DOM node or an array of DOM nodes (including a jQuery object).
 *  @param {node|array} rows The row, or array of nodes, to delete
 *  @param {string} [title] The title to show in the form header
 *  @param {object|array} [buttons] The buttons to use in the display. If not given
 *    or null, then the buttons already setup for the form (using the <i>buttons</i>
 *    method) will be used
 *  @param {boolean} [show=true] Show the form or not. If false the form is not shown
 *    to the user, which can be useful when no confirmation is required for an action.
 * 
 *  @example
 *    // Delete a given row with a message to let the user know exactly what is
 *    // happening
 *    editor.message( "Are you sure you want to remove this row?" );
 *    editor.remove( row_to_delete, 'Delete row', {
 *      "label": "Confirm",
 *      "fn": function () { this.submit(); }
 *    } );
 * 
 *  @example
 *    // Delete the first row in a table without asking the user for confirmation
 *    editor.remove( '', $('#example tbody tr:eq(0)')[0], null, false );
 *    editor.submit();
 * 
 *  @example
 *    // Delete all rows in a table with a submit button
 *    editor.remove( $('#example tbody tr'), 'Delete all rows', {
 *      "label": "Delete all",
 *      "fn": function () { this.submit(); }
 *    } );
 */
DataTable.Editor.prototype.remove = function ( rows, title, buttons, show )
{
	var that = this;

	// Allow a single row node to be passed in to remove
	if ( !$.isArray( rows ) ) {
		this.remove( [ rows ], title, buttons, show );
		return;
	}

	this.s.id = "";
	this.s.action = "remove";
	this.s.removeRows = rows;
	this.dom.form.style.display = 'none';
	
	this._actionClass();
	if ( title ) {
		this.title( title );
	}
	if ( buttons ) {
		this.buttons( buttons );
	}

	if ( show === undefined || show ) {
		this._display('open');
	}
};


/**
 * Set the value of a field
 *  @param {string} name The field name (from the <i>name</i> parameter given when
 *    originally setting up the field) to disable.
 *  @param {*} val The value to set the field to. The format of the value will depend
 *    upon the field type.
 *
 *  @example
 *    // Set the values of a few fields before then automatically submitting the form
 *    editor.create( null, null, false );
 *    editor.set( 'name', 'Test user' );
 *    editor.set( 'access', 'Read only' );
 *    editor.submit();
 */
DataTable.Editor.prototype.set = function ( name, val )
{
	var field = this._findField( name );
	if ( field ) {
		FieldTypes[ field.type ].set( field, val );
	}
};


/**
 * Show a field in the display that was previously hidden.
 *  @param {string|array} [name] The field name (from the <i>name</i> parameter given when
 *   originally setting up the field) to make visible, or an array of field names to make
 *   visible. If not given all fields are shown.
 * 
 *  @example
 *    // Shuffle the fields that are visible, hiding one field and making two
 *    // others visible before then showing the 'create' record form.
 *    editor.hide( 'username' );
 *    editor.show( 'account_type' );
 *    editor.show( 'access_level' );
 *    editor.create( 'Add new user', {
 *      "label": "Save",
 *      "fn": function () { this.submit(); }
 *    } );
 *
 *  @example
 *    // Show all fields
 *    editor.show();
 */
DataTable.Editor.prototype.show = function ( name )
{
	var i, iLen;

	if ( !name ) {
		for ( i=0, iLen=this.s.fields.length ; i<iLen ; i++ ) {
			this.show( this.s.fields[i].name );
		}
	}
	else if ( $.isArray(name) ) {
		for ( i=0, iLen=name.length ; i<iLen ; i++ ) {
			this.show( name[i] );
		}
	}
	else {
		var field = this._findField( name );
		if ( field ) {
			if ( this.s.displayed ) {
				$(field._wrapper).slideDown();
			}
			else {
				field._wrapper.style.display = "block";
			}
		}
	}
};


/**
 * Submit a form to the server for processing. The exact action performed will depend
 * on which of the methods 'create', 'edit' or 'remove' were called to prepare the
 * form - regardless of which one is used, you call this method to submit data.
 *  @param {function} [successCallback] Callback function that is executed once the
 *    form has been successfully submitted to the server and no errors occurred.
 *  @param {function} [errorCallback] Callback function that is executed if the
 *    server reports an error due to the submission (this includes a JSON formatting
 *    error should the error return invalid JSON).
 *  @param {function} [formatdata] Callback function that is passed in the data
 *    that will be submitted to the server, allowing pre-formatting of the data,
 *    removal of data or adding of extra fields.
 *  @param {boolean} [hide=true] When the form is successfully submitted, by default
 *    the form display will be hidden - this option allows that to be overridden.
 *
 *  @example
 *    // Submit data from a form button
 *    editor.create( 'Add new record', {
 *      "label": "Save",
 *      "fn": function () {
 *        this.submit();
 *      }
 *    } );
 *
 *  @example
 *    // Submit without showing the user the form
 *    editor.create( null, null, false );
 *    editor.submit();
 *
 *  @example
 *    // Provide success and error callback methods
 *    editor.create( 'Add new record', {
 *      "label": "Save",
 *      "fn": function () {
 *        this.submit( function () {
 *            alert( 'Form successfully submitted!' );
 *          }, function () {
 *            alert( 'Form  encountered an error :-(' );
 *          }
 *        );
 *      }
 *    } );
 *  
 *  @example
 *    // Add an extra field to the data
 *    editor.create( 'Add new record', {
 *      "label": "Save",
 *      "fn": function () {
 *        this.submit( null, null, function (data) {
 *          data.extra = "Extra information";
 *        } );
 *      }
 *    } );
 *
 *  @example
 *    // Don't hide the form immediately - change the title and then close the form
 *    // after a small amount of time
 *    editor.create( 'Add new record', {
 *      "label": "Save",
 *      "fn": function () {
 *        this.submit( 
 *          function () {
 *            var that = this;
 *            this.title( 'Data successfully added!' );
 *            setTimeout( function () {
 *              that.close();
 *            }, 1000 );
 *          },
 *          null,
 *          null,
 *          false
 *        );
 *      }
 *    } );
 *    
 */
DataTable.Editor.prototype.submit = function ( successCallback, errorCallback, formatdata, hide )
{
	var that = this;
	var run = true;

	if ( this.s.processing || !this.s.action ) {
		return;
	}
	this._processing( true );

	// Remove any errors that are currently displayed as we now have no idea 
	// if they are still in error or not - the server will decide

	// If we have visible errors, we need to slide them out before submitting, so the 
	// 'scroll to error' will be able to calculate the correct position of the first 
	// field in error
	if ( $('div.DTE_Field_Error:visible', this.dom.wrapper).length > 0 ) {
		$('div.DTE_Field_Error:visible', this.dom.wrapper).slideUp( function () {
			// If multiple elements were to match, the callback would run multiple times
			if ( run ) {
				that._submit(successCallback, errorCallback, formatdata, hide);
				run = false;
			}
		} );
	}
	else {
		this._submit(successCallback, errorCallback, formatdata, hide);
	}

	$('div.DTE_Field_StateError', this.dom.wrapper).removeClass('DTE_Field_StateError');
	$(this.dom.formError).fadeOut();
};


/**
 * Set the title of the form
 *  @param {string} title The title to give to the form
 *
 *  @example
 *    // Create an edit display used the title, buttons and edit methods (note that
 *    // this is just an example, typically you would use the parameters of the edit
 *    // method to achieve this.
 *    editor.title( 'Edit record' );
 *    editor.buttons( {
 *      "label": "Update",
 *      "fn": function () { this.submit(); }
 *    } );
 *    editor.edit( TR_to_edit );
 *
 *  @example
 *    // Show a create form, with a timer for the duration that the form is open
 *    editor.create( 'Add new record - time on form: 0s', {
 *      "label": "Save",
 *      "fn": function () { this.submit(); }
 *    } );
 *    
 *    // Add an event to the editor to stop the timer when the display is removed
 *    var runTimer = true;
 *    var timer = 0;
 *    editor.on( 'onClose', function () {
 *      runTimer = false;
 *      editor.off( 'onClose' );
 *    } );
 *    // Start the timer running
 *    updateTitle();
 *
 *    // Local function to update the title once per second
 *    function updateTitle() {
 *      editor.title( 'Add new record - time on form: '+timer+'s' );
 *      timer++;
 *      if ( runTimer ) {
 *        setTimeout( function() {
 *          updateTitle();
 *        }, 1000 );
 *      }
 *    }
 */
DataTable.Editor.prototype.title = function ( title )
{
	this.dom.header.innerHTML = title;
};



/**
 * Editor constructor - take the developer configuration and apply it to the instance.
 *  @param {object} init The initialisation options provided by the developer - see
 *    {@link DataTable.Editor.defaults} for a full list of options.
 *  @private
 */
DataTable.Editor.prototype._constructor = function ( init )
{
	init = $.extend( true, {}, DataTable.Editor.defaults, init );
	this.s = $.extend( true, {}, DataTable.Editor.models.settings );

	this.dom = {
		"wrapper": $(
			'<div class="DTE">'+
				'<div class="DTE_Processing_Indicator"></div>'+
				'<div class="DTE_Header">'+
					'<div class="DTE_Header_Content">'+
						// Header (title) content is inserted here
					'</div>'+
				'</div>'+
				'<div class="DTE_Body">'+
					'<div class="DTE_Body_Content">'+
						'<div class="DTE_Form_Info">'+
							// Form information is inserted here
						'</div>'+
						'<form>'+
							'<div class="DTE_Form_Content">'+
									// Form fields are inserted here
								'<div class="DTE_Form_Clear"></div>'+
							'</div>'+
						'</form>'+
					'</div>'+
				'</div>'+
				'<div class="DTE_Footer">'+
					'<div class="DTE_Footer_Content">'+
						'<div class="DTE_Form_Error">'+
							// Global form errors are inserted here
						'</div>'+
						'<div class="DTE_Form_Buttons">'+
							// Buttons are inserted here
						'</div>'+
					'</div>'+
				'</div>'+
			'</div>'
		)[0],
		"form": null,
		"formClear": null,
		"formError": null,
		"formInfo": null,
		"formContent": null,
		"header": null,
		"body": null,
		"bodyContent": null,
		"footer": null,
		"processing": null,
		"buttons": null
	};


	var that = this;

	// Options
	this.s.domTable = init.domTable;
	this.s.dbTable = init.dbTable;
	this.s.ajaxUrl = init.ajaxUrl;
	this.s.ajax = init.ajax;

	// Bind callback methods
	this._callbackReg( 'processing', init.events.onProcessing, 'User' );
	this._callbackReg( 'open', init.events.onOpen, 'User' );
	this._callbackReg( 'close', init.events.onClose, 'User' );
	this._callbackReg( 'presubmit', init.events.onPreSubmit, 'User' );
	this._callbackReg( 'submitLoaded', init.events.onPostSubmit, 'User' );
	this._callbackReg( 'submitComplete', init.events.onSubmitComplete, 'User' );
	this._callbackReg( 'submitSuccess', init.events.onSubmitSuccess, 'User' );
	this._callbackReg( 'submitError', init.events.onSubmitError, 'User' );
	this._callbackReg( 'precreate', init.events.onPreCreate, 'User' );
	this._callbackReg( 'create', init.events.onCreate, 'User' );
	this._callbackReg( 'postcreate', init.events.onPostCreate, 'User' );
	this._callbackReg( 'preedit', init.events.onPreEdit, 'User' );
	this._callbackReg( 'edit', init.events.onEdit, 'User' );
	this._callbackReg( 'postedit', init.events.onPostEdit, 'User' );
	this._callbackReg( 'preremove', init.events.onPreRemove, 'User' );
	this._callbackReg( 'remove', init.events.onRemove, 'User' );
	this._callbackReg( 'postremove', init.events.onPostRemove, 'User' );
	this._callbackReg( 'setData', init.events.onSetData, 'User' );
	this._callbackReg( 'initComplete', init.events.onInitComplete, 'User' );

	// Cache the DOM nodes
	this.dom.form = $('form', this.dom.wrapper)[0];
	this.dom.formClear = $('div.DTE_Form_Clear', this.dom.wrapper)[0];
	this.dom.formError = $('div.DTE_Form_Error', this.dom.wrapper)[0];
	this.dom.formInfo = $('div.DTE_Form_Info', this.dom.wrapper)[0];
	this.dom.formContent = $('div.DTE_Form_Content', this.dom.wrapper)[0];
	this.dom.header = $('div.DTE_Header_Content', this.dom.wrapper)[0];
	this.dom.body = $('div.DTE_Body', this.dom.wrapper)[0];
	this.dom.bodyContent = $('div.DTE_Body_Content', this.dom.wrapper)[0];
	this.dom.footer = $('div.DTE_Footer', this.dom.wrapper)[0];
	this.dom.processing = $('div.DTE_Processing_Indicator', this.dom.wrapper)[0];
	this.dom.buttons = $('div.DTE_Form_Buttons', this.dom.wrapper)[0];

	// Allow styling on a table specific basis
	if ( this.s.dbTable !== "" ) {
		$(this.dom.wrapper).addClass('DTE_Table_Name_'+this.s.dbTable);
	}

	// Add any fields which are given on initialisation
	if ( init.fields ) {
		for ( var i=0, iLen=init.fields.length ; i<iLen ; i++ ) {
			this.add( init.fields[i] );
		}
	}

	// When the form is submitted, then we use our own submit event handler
	$(this.dom.form).submit( function (e) {
		that.submit();
		e.preventDefault();
	} );

	// Prep the display controller
	this.s.displayController = DataTable.Editor.display[init.display].init( this );

	this._callbackFire( 'initComplete', 'onInitComplete', [] );
};



/**
 * Set the class on the form to relate to the action that is being performed.
 * This allows styling to be applied to the form to reflect the state that
 * it is in.
 *  @private
 */
DataTable.Editor.prototype._actionClass = function ()
{
	$(this.dom.wrapper).removeClass('DTE_Action_Create DTE_Action_Edit DTE_Action_Remove');

	if ( this.s.action === "create" ) {
		$(this.dom.wrapper).addClass('DTE_Action_Create');
	}
	else if ( this.s.action === "edit" ) {
		$(this.dom.wrapper).addClass('DTE_Action_Edit');
	}
	else if ( this.s.action === "remove" ) {
		$(this.dom.wrapper).addClass('DTE_Action_Remove');
	}
};

/**
 * Fire callback functions and trigger events.
 *  @param {string} store Name of the array storage for the callbacks in the 
 *    settings object
 *  @param {string} trigger Name of the jQuery custom event to trigger. If null no 
 *    trigger is fired
 *  @param {array) args Array of arguments to pass to the callback function / trigger
 *  @private
 */
DataTable.Editor.prototype._callbackFire = function ( store, trigger, args )
{
	var eventStore = this.s.events[store];
	var ret =[];

	for ( var i=0, iLen=eventStore.length ; i<iLen ; i++ )
	{
		ret.push( eventStore[i].fn.apply( this, args ) );
	}

	if ( trigger !== null )
	{
		var e = $.Event(trigger);
		$(this).trigger(e, args);
		ret.push( e.result );
	}

	return ret;
};

/**
 * Register a callback function. Easily allows a callback function to be added to
 * an array store of callback functions that can then all be called together.
 *  @param {string} store Name of the array storage for the callbacks in the
 *    instance's settings object
 *  @param {function} fn Function to be called back
 *  @param {string) name Identifying name for the callback (i.e. a label)
 *  @private
 */
DataTable.Editor.prototype._callbackReg = function ( store, fn, name )
{
	if ( fn ) {
		this.s.events[store].push( {
			"fn": fn,
			"name": name
		} );
	}
};

/**
 * Clear all of the information that might have been dynamically set while
 * the form was visible - specifically errors and dynamic messages
 *  @private
 */
DataTable.Editor.prototype._clearDynamicInfo = function ()
{
	// Clear errors and other information set dynamically
	$('div.DTE_Field_StateError', this.dom.wrapper).removeClass('DTE_Field_StateError');
	$('div.DTE_Field_Error', this.dom.wrapper).html("").css('display', 'none');
	this.error("");
	this.message("");
};

/**
 * Have the display controller display or hide the form
 *  @param {string} action Open ("open") or close ("close") the form display
 *  @param {function} [fn] Callback function once the open or close is complete
 *  @private
 */
DataTable.Editor.prototype._display = function ( action, fn )
{
	var that = this;

	if ( action === "open" ) {
		that.s.displayed = true;
		this.s.displayController.open( this, this.dom.wrapper, function () {
			if ( fn ) {
				fn();
			}
		} );

		this._callbackFire( 'open', 'onOpen' );
	}
	else if ( action === "close" ) {
		this.s.displayController.close( this, function () {
			that.s.displayed = false;
			if ( fn ) {
				fn();
			}
		} );

		this._callbackFire( 'close', 'onClose' );
	}
};

/**
 * Find a field configuration object from the name of a field
 *  @param {string} fieldName The field to find
 *  @returns {object} The field object for the field name requested
 *  @private
 */
DataTable.Editor.prototype._findField = function ( fieldName )
{
	for ( var i=0, iLen=this.s.fields.length ; i<iLen ; i++ ) {
		if ( this.s.fields[i].name === fieldName ) {
			return this.s.fields[i];
		}
	}
	return undefined;
};

/**
 * Find the index of a field configuration object from the name of a field
 *  @param {string} fieldName The field to find
 *  @returns {int} The field object index in the settings fields array
 *  @private
 */
DataTable.Editor.prototype._findFieldIndex = function ( fieldName )
{
	for ( var i=0, iLen=this.s.fields.length ; i<iLen ; i++ ) {
		if ( this.s.fields[i].name === fieldName ) {
			return i;
		}
	}
	return undefined;
};

/**
 * Show a message in the form. This can be used for error messages or dynamic
 * messages (information display) as the structure for each is basically the
 * same. This method will take into account if the form is visible or not - if
 * so then the message is shown with an effect for the end user, otherwise
 * it is just set immediately.
 *  @param {element} el The field display node to use
 *  @param {string} effect The display effect to use if the form is visible -
 *    can be either 'slide' or 'fade' (default).
 *  @param {string} msg The message to show
 *  @private
 */
DataTable.Editor.prototype._message = function ( el, effect, msg )
{
	if ( msg === "" && this.s.displayed ) {
		// Clear the message with visual effect since the form is visible
		if ( effect === 'slide' ) {
			$(el).slideUp();
		}
		else {
			$(el).fadeOut();
		}
	}
	else if ( msg === "" ) {
		// Clear the message without visual effect
		el.style.display = "none";
	}
	else if ( this.s.displayed ) {
		// Show the message with visual effect
		if ( effect === 'slide' ) {
			$(el).html( msg ).slideDown();
		}
		else {
			$(el).html( msg ).fadeIn();
		}
	}
	else {
		// Show the message without visual effect
		$(el).html( msg );
		el.style.display = "block";
	}
};

/**
 * Set the form into processing mode or take it out of processing mode. In
 * processing mode a processing indicator is shown and user interaction with the
 * form buttons is blocked
 *  @param {boolean} processing true if to go into processing mode and false if
 *    to come out of processing mode
 *  @private
 */
DataTable.Editor.prototype._processing = function ( processing )
{
	this.s.processing = processing;

	if ( processing ) {
		this.dom.processing.style.display = 'block';
		$(this.dom.wrapper).addClass('DTE_Processing');
	}
	else {
		this.dom.processing.style.display = 'none';
		$(this.dom.wrapper).removeClass('DTE_Processing');
	}

	this._callbackFire( 'processing', 'onProcessing', [processing] );
};


/**
 * Submit a form to the server for processing. This is the private method that is used
 * by the 'submit' API method, which should always be called in preference to calling
 * this method directly.
 *  @param {function} [successCallback] Callback function that is executed once the
 *    form has been successfully submitted to the server and no errors occurred.
 *  @param {function} [errorCallback] Callback function that is executed if the
 *    server reports an error due to the submission (this includes a JSON formatting
 *    error should the error return invalid JSON).
 *  @param {function} [formatdata] Callback function that is passed in the data
 *    that will be submitted to the server, allowing pre-formatting of the data,
 *    removal of data or adding of extra fields.
 *  @param {boolean} [hide=true] When the form is successfully submitted, by default
 *    the form display will be hidden - this option allows that to be overridden.
 *  @private
 */
DataTable.Editor.prototype._submit = function ( successCallback, errorCallback, formatdata, hide )
{
	var that = this;
	var i, iLen, eventRet;
	var data = {
		"action": this.s.action,
		"table": this.s.dbTable,
		"id": this.s.id,
		"data": {}
	};

	// Gather the data that is to be submitted
	if ( this.s.action === "create" || this.s.action === "edit" ) {
		// Add and edit use the main fields array
		for ( i=0, iLen=this.s.fields.length ; i<iLen ; i++ ) {
			var field = this.s.fields[i];
			data.data[field.name] = FieldTypes[ field.type ].get( field );
		}
	}
	else {
		// Remove (delete)
		data.data = [];
		for ( i=0, iLen=this.s.removeRows.length ; i<iLen ; i++ ) {
			data.data.push( this.s.removeRows[i].id );
		}
	}

	// Allow the data to be submitted to the server to be preprocessed by callback
	// and event functions
	if ( formatdata ) {
		formatdata( data );
	}
	eventRet = this._callbackFire( 'presubmit', 'onPreSubmit', [data] );
	if ( $.inArray( false, eventRet ) !== -1 ) {
		this._processing( false );
		return;
	}

	// Submit to the server (or whatever method is defined in the settings)
	this.s.ajax(
		this.s.ajaxUrl,
		data,
		function (json) {
			that._callbackFire( 'submitLoaded', 'onSubmitLoaded', [json, data] );

			if ( !json.error ) {
				json.error = "";
			}
			if ( !json.fieldErrors ) {
				json.fieldErrors = [];
			}

			if ( json.error !== "" || json.fieldErrors.length !== 0 ) {
				// Global form error
				that.error( json.error );
				
				// Field specific errors
				for ( i=0, iLen=json.fieldErrors.length ; i<iLen ; i++ ) {
					var errorField = that._findField( json.fieldErrors[i].name );
					that.error( json.fieldErrors[i].name, json.fieldErrors[i].status );
				}

				// Scroll the display to the first error if there is one
				if ( json.fieldErrors.length > 0 ) {
					$(that.dom.bodyContent, that.s.wrapper).animate( {
						"scrollTop": $('div.DTE_Field_StateError:eq(0)').position().top
					}, 600 );
				}

				if ( errorCallback ) {
					errorCallback.call( that, json );
				}
			}
			else {
				var dt = $(that.s.domTable).dataTable();
				// Gather the data form the form that will be used to update the DataTable
				var setData = {};
				for ( i=0, iLen=that.s.fields.length ; i<iLen ; i++ ) {
					var field = that.s.fields[i];
					if ( field.dataProp !== null ) {
						setData[field.dataProp] = FieldTypes[ field.type ].get( field );
					}
				}
				that._callbackFire( 'setData', 'onSetData', [json, setData, that.s.action] );
				
				if ( dt.fnSettings().oFeatures.bServerSide ) {
					// Regardless of if it was a new row, an update or an delete, with 
					// SSP we draw the table to refresh the content
					dt.fnDraw();
				}
				else if ( that.s.action === "create" ) {
					// New row was created to add it to the DT
					setData.DT_RowId = json.id;
					that._callbackFire( 'precreate', 'onPreCreate', [json, setData] );
					dt.fnAddData( setData );
					that._callbackFire( 'create', 'onCreate', [json, setData] );
				}
				else if ( that.s.action === "edit" ) {
					// Row was updated, so tell the DT
					that._callbackFire( 'preedit', 'onPreEdit', [json, setData] );
					dt.fnUpdate( setData, that.s.editRow );
					that._callbackFire( 'edit', 'onEdit', [json, setData] );
				}
				else if ( that.s.action === "remove" ) {
					// Remove the rows given and then redraw the table
					that._callbackFire( 'preremove', 'onPreRemove', [json] );
					for ( i=0, iLen=that.s.removeRows.length ; i<iLen ; i++ ) {
						dt.fnDeleteRow( that.s.removeRows[i], false );
					}
					dt.fnDraw();
					that._callbackFire( 'remove', 'onRemove', [json] );
				}

				// Submission complete
				that.s.action = null;

				// Hide the display
				if ( hide === undefined || hide ) {
					that._display( 'close', function () {
						that._clearDynamicInfo();
					} );
				}

				// All done - fire off the callbacks and events
				if ( successCallback ) {
					successCallback.call( that, json );
				}
				that._callbackFire( 'submitSuccess', 'onSubmitSuccess', [json, setData] );
				that._callbackFire( 'submitComplete', 'onSubmitComplete', [json, setData] );
			}

			that._processing( false );
		},
		function (xhr, err, thrown) {
			that._callbackFire( 'submitLoaded', 'onSubmitLoaded', [xhr, err, thrown, data] );

			that.error( "An error has occurred - Please contact the system administrator" );
			that._processing( false );

			if ( errorCallback ) {
				errorCallback.call( that, xhr, err, thrown );
			}

			that._callbackFire( 'submitError', 'onSubmitError', [xhr, err, thrown, data] );
			that._callbackFire( 'submitComplete', 'onSubmitComplete', [xhr, err, thrown, data] );
		}
	); // /ajax submit
};


/*
 * Defaults
 */


// Dev node - although this file is held in the models directory (because it
// really is a model, it is assigned to DataTable.Editor.defaults for easy
// and sensible access to set the defaults for Editor.

/**
 * Initialisation options that can be given to Editor at initialisation time.
 *  @namespace
 */
DataTable.Editor.defaults = {
	/**
	 * jQuery selector that can be used to identify the table you wish to apply
	 * this editor instance to. We can't pass in the DataTables instance itself,
	 * as often you will wish to initialise the form controller first, so by
	 * providing the selector, Editor can access the DataTable when it needs
	 * to in future.
	 *  @type string
	 *  @default <i>Empty string</i>
	 *
	 *  @example
	 *    $(document).ready(function() {
	 *      var editor = new $.fn.DataTable.Editor( {
	 *        "ajaxUrl": "php/index.php",
	 *        "domTable": "#example"
	 *      } );
	 *    } );
	 */
	"domTable": null,

	/**
	 * The URL which will accept the data for the create, edit and remove functions. The
	 * target script / program must accept data in the format defined by Editor and
	 * return the expected JSON as required by Editor.
	 *  @type string
	 *  @default <i>Empty string</i>
	 *
	 *  @example
	 *    $(document).ready(function() {
	 *      var editor = new $.fn.DataTable.Editor( {
	 *        "ajaxUrl": "php/index.php",
	 *        "domTable": "#example"
	 *      } );
	 *    } );
	 */
	"ajaxUrl": "",

	/**
	 * Fields to initialise the form with - see {@link DataTable.Editor.models.field} for
	 * a full list of the options available to each field. Note that if fields are not 
	 * added to the form at initialisation time using this option, they can be added using
	 * the {@link DataTable.Editor#add} API method.
	 *  @type array
	 *  @default []
	 *
	 *  @example
	 *    $(document).ready(function() {
	 *      var editor = new $.fn.DataTable.Editor( {
	 *        "ajaxUrl": "php/index.php",
	 *        "domTable": "#example",
	 *        "fields": [ {
	 *            "label": "User name:",
	 *            "name": "username"
	 *          }
	 *          // More fields would typically be added here!
	 *        } ]
	 *      } );
	 *    } );
	 */
	"fields": [],


	/**
	 * A unique identifier for the database table that the Editor instance is
	 * intended to control. Editor itself does not use these parameter for any
	 * actions, but it will include it in the data submitted to the server. This
	 * means that a single Ajax script could control multiple tables, switching
	 * between each table as required by checking for this variable.
	 *  @type string
	 *  @default <i>Empty string</i>
	 *
	 *  @example
	 *    $(document).ready(function() {
	 *      var editor = new $.fn.DataTable.Editor( {
	 *        "ajaxUrl": "php/index.php",
	 *        "domTable": "#example",
	 *        "dbTable": "users"
	 *      } );
	 *    } );
	 */
	"dbTable": "",

	/**
	 * The display controller for the form. The form itself is just a collection of
	 * DOM elements which require a display container. This display controller allows
	 * the visual appearance of the form to be significantly altered without major
	 * alterations to the Editor code. There are two display controllers built into
	 * Editor <i>lightbox</i> and <i>envelope</i>. The value of this property will
	 * be used to access the display controller defined in {@link DataTable.Editor.display}
	 * for the given name. Additional display controllers can be added by adding objects
	 * to that object, through extending the displayController model:
	 * {@link DataTable.Editor.models.displayController}.
	 *  @type string
	 *  @default lightbox
	 *
	 *  @example
	 *    $(document).ready(function() {
	 *      var editor = new $.fn.DataTable.Editor( {
	 *        "ajaxUrl": "php/index.php",
	 *        "domTable": "#example",
	 *        "display": 'envelope'
	 *      } );
	 *    } );
	 */
	"display": 'lightbox',

	/**
	 * The function that is used to submit data to the server. This is provided as
	 * an initialisation parameter to allow custom Ajax calls, or even to get / set
	 * data that is not requested by Ajax, but possibly by some other method (for
	 * example localStorage). The function takes four parameters and no return is
	 * expected.
	 *  @type function
	 *  @param {string} url - The URL (from <i>ajaxUrl</i>) to submit the data to
	 *  @param {object} data - The data submitted to the server by Editor
	 *  @param {function} successCallback - Callback function on data retrieval success
	 *  @param {function} errorCallback - Callback function on data retrieval error
	 *  @default $.ajax() using POST
	 *
	 *  @example
	 *    // Using GET rather than POST
	 *    $(document).ready(function() {
	 *      var editor = new $.fn.DataTable.Editor( {
	 *        "ajaxUrl": "php/index.php",
	 *        "domTable": "#example",
	 *        "ajax": function ( url, data, successCallback, errorCallback ) {
	 *          $.ajax( {
	 *            "url":  url,
	 *            "data": data,
	 *            "dataType": "json",
	 *            "type": "GET",
	 *            "success": function (json) {
	 *              successCallback( json );
	 *            },
	 *            "error": function (xhr, error, thrown) {
	 *              errorCallback( xhr, error, thrown );
	 *            }
	 *          } );
	 *        }
	 *      } );
	 *    } );
	 */
	"ajax": function ( url, data, successCallback, errorCallback ) {
		$.ajax( {
			"url":  url,
			"data": data,
			"dataType": "json",
			"type": "POST",
			"success": function (json) {
				successCallback( json );
			},
			"error": function (xhr, error, thrown) {
				errorCallback( xhr, error, thrown );
			}
		} );
	},

	/**
	 * Events / callbacks - event handlers can be assigned as an individual function
	 * during initialisation using the parameters in this name space. The names, and
	 * the parameters passed to each callback match their event equivalent in the
	 * {@link DataTable.Editor} object.
	 *  @namespace
	 */
	"events": {
		/**
		 * Processing event, fired when Editor submits data to the server for processing.
		 * This can be used to provide your own processing indicator if your UI framework
		 * already has one.
		 *  @type function
		 *  @param {boolean} processing Flag for if the processing is running (true) or
		 *    not (false).
		 */
		"onProcessing": null,
		
		/**
		 * Form displayed event, fired when the form is made available in the DOM. This
		 * can be useful for fields that require height and width calculations to be
		 * performed since the element is not available in the document until the
		 * form is displayed.
		 *  @type function
		 */
		"onOpen": null,
		
		/**
		 * Form hidden event, fired when the form is removed from the document. The 
		 * of the inverse onOpen event.
		 *  @type function
		 */
		"onClose": null,
		
		/**
		 * Pre-submit event for the form, fired just before the data is submitted to
		 * the server. This event allows you to modify the data that will be submitted
		 * to the server. Note that this event runs after the 'formatdata' callback
		 * function of the {@link DataTable.Editor#submit} API method.
		 *  @type function
		 *  @param {object} data The data object that will be submitted to the server
		 */
		"onPreSubmit": null,
		
		/**
		 * Post-submit event for the form, fired immediately after the data has been
		 * loaded by the Ajax call, allowing modification or any other interception
		 * of the data returned form the server.
		 *  @type function
		 *  @param {object} json The JSON object returned from the server
		 *  @param {object} data The data object that was be submitted to the server
		 */
		"onPostSubmit": null,
		
		/**
		 * Submission complete event, fired when data has been submitted to the server and
		 * after any of the return handling code has been run (updating the DataTable
		 * for example). Note that unlike onSubmitSuccess and onSubmitError, onSubmitComplete
		 * will be fired for both a successful submission and an error. Additionally this
		 * event will be fired after onSubmitSuccess or onSubmitError.
		 *  @type function
		 *  @param {object} json The JSON object returned from the server
		 *  @param {object} data The data that was used to update the DataTable
		 */
		"onSubmitComplete": null,
		
		/**
		 * Submission complete and successful event, fired when data has been successfully 
		 * submitted to the server and all actions required by the returned data (inserting
		 * or updating a row) have been completed.
		 *  @type function
		 *  @param {object} json The JSON object returned from the server
		 *  @param {object} data The data that was used to update the DataTable
		 */
		"onSubmitSuccess": null,
		
		/**
		 * Submission complete, but in error event, fired when data has been submitted to 
		 * the server but an error occurred on the server (typically a JSON formatting error)
		 *  @type function
		 *  @param {object} xhr The Ajax object
		 *  @param {string} err The error message from jQuery
		 *  @param {object} thrown The exception thrown by jQuery
		 *  @param {object} data The data that was used to update the DataTable
		 */
		
		"onSubmitError": null,
		
		/**
		 * Pre-create new row event, fired just before DataTables calls the fnAddData method
		 * to add new data to the DataTable, allowing modification of the data that will be
		 * used to insert into the table.
		 *  @type function
		 *  @param {object} json The JSON object returned from the server
		 *  @param {object} data The data that will be used to update the DataTable
		 */
		"onPreCreate": null,
		
		/**
		 * Create new row event, fired when a new row has been created in the DataTable by
		 * a form submission. This is called just after the fnAddData call to the DataTable.
		 *  @type function
		 *  @param {object} json The JSON object returned from the server
		 *  @param {object} data The data that was used to update the DataTable
		 */
		"onCreate": null,
		
		/**
		 * As per the onCreate event - included for naming consistency.
		 *  @type function
		 *  @param {object} json The JSON object returned from the server
		 *  @param {object} data The data that was used to update the DataTable
		 */
		"onPostCreate": null,
		
		/**
		 * Pre-edit row event, fired just before DataTables calls the fnUpdate method
		 * to edit data in a DataTables row, allowing modification of the data that will be
		 * used to update the table.
		 *  @type function
		 *  @param {object} json The JSON object returned from the server
		 *  @param {object} data The data that will be used to update the DataTable
		 */
		"onPreEdit": null,
		
		/**
		 * Edit row event, fired when a row has been edited in the DataTable by a form
		 * submission. This is called just after the fnUpdate call to the DataTable.
		 *  @type function
		 *  @param {object} json The JSON object returned from the server
		 *  @param {object} data The data that was used to update the DataTable
		 */
		"onEdit": null,
		
		/**
		 * As per the onEdit event - included for naming consistency.
		 *  @type function
		 *  @param {object} json The JSON object returned from the server
		 *  @param {object} data The data that was used to update the DataTable
		 */
		"onPostEdit": null,
		
		/**
		 * Pre-remove row event, fired just before DataTables calls the fnDeleteRow method
		 * to delete a DataTables row.
		 *  @type function
		 *  @param {object} json The JSON object returned from the server
		 */
		"onPreRemove": null,
		
		/**
		 * Row removed event, fired when a row has been removed in the DataTable by a form
		 * submission. This is called just after the fnDeleteRow call to the DataTable.
		 *  @type function
		 *  @param {object} json The JSON object returned from the server
		 */
		"onRemove": null,
		
		/**
		 * As per the onRemove event - included for naming consistency.
		 *  @type function
		 *  @param {object} json The JSON object returned from the server
		 */
		"onPostRemove": null,
		
		/**
		 * Set data event, fired when the data is gathered from the form to be used
		 * to update the DataTable. This is a "global" version of onPreCreate, onPreEdit
		 * and onPreRemove and can be used to manipulate the data that will be added
		 * to the DataTable for all three actions
		 *  @type function
		 *  @param {object} json The JSON object returned from the server
		 *  @param {object} data The data that will be used to update the DataTable
		 *  @param {string} action The action being performed by the form - 'create',
		 *    'edit' or 'remove'.
		 */
		"onSetData": null,
		
		/**
		 * Initialisation of the Editor instance has been completed.
		 *  @type function
		 */
		"onInitComplete": null
	}
};


/*
 * Extensions
 */


/*
 * Add helpful TableTool buttons to make life easier
 */
if ( window.TableTools ) {
	window.TableTools.BUTTONS.editor_create = $.extend( true, window.TableTools.BUTTONS.text, {
		"sButtonText": "New",
		"editor": null,
		"formTitle": "Create new entry",
		"formButtons": [
			{ "label": "Create", "fn": function (e) { this.submit(); } }
		],
		"fnClick": function( nButton, oConfig ) {
			oConfig.editor.create( oConfig.formTitle, oConfig.formButtons );
		}
	} );


	window.TableTools.BUTTONS.editor_edit = $.extend( true, window.TableTools.BUTTONS.select_single, {
		"sButtonText": "Edit",
		"editor": null,
		"formTitle": "Edit entry",
		"formButtons": [
			{ "label": "Update", "fn": function (e) { this.submit(); } }
		],
		"fnClick": function( nButton, oConfig ) {
			var selected = this.fnGetSelected();
			if ( selected.length !== 1 ) {
				return;
			}
			
			oConfig.editor.edit( selected[0], oConfig.formTitle, oConfig.formButtons );
		}
	} );


	window.TableTools.BUTTONS.editor_remove = $.extend( true, window.TableTools.BUTTONS.select, {
		"sButtonText": "Delete",
		"editor": null,
		"formTitle": "Delete",
		"formButtons": [
			{
				"label": "Delete",
				"fn": function (e) {
					// Executed in the Form instance's scope
					var that = this;
					this.submit( function ( json ) {
						var tt = window.TableTools.fnGetInstance( $(that.s.domTable)[0] );
						tt.fnSelectNone();
					} );
				}
			}
		],
		"question": function ( rows ) {
			return "Are you sure you wish to delete "+rows.length+" row"+(rows.length===1?"?":"s?");
		},
		"fnClick": function( nButton, oConfig ) {
			var rows = this.fnGetSelected();
			if ( rows.length === 0 ) {
				return;
			}

			oConfig.editor.message( typeof oConfig.question === 'function' ? oConfig.question(rows) : oConfig.question );
			oConfig.editor.remove( rows, oConfig.formTitle, oConfig.formButtons );
		}
	} );
}


/**
 * Field types array - this can be used to add field types or modify the pre-defined options.
 * By default Editor provides the following field tables (these can be readily modified,
 * extended or added to using field type plug-ins if you wish to create a custom input
 * control):
 *   <ul>
 *     <li>hidden - A hidden field which cannot be seen or modified by the user</li>
 *     <li>readonly - Input where the value cannot be modified</li>
 *     <li>text - Text input</li>
 *     <li>password - Text input but bulleted out text</li>
 *     <li>textarea - Textarea input for larger text inputs</li>
 *     <li>select - Single &lt;select&gt; list</li>
 *     <li>checkbox - Checkboxs</li>
 *     <li>radio - Radio buttons</li>
 *     <li>date - Date input control (requires jQuery UI's datepicker)</li>
 *   </ul>
 *  @namespace
 */
DataTable.Editor.fieldTypes = FieldTypes;


FieldTypes.hidden = $.extend( true, {}, DataTable.Editor.models.fieldType, {
	"create": function ( conf ) {
		conf._val = conf.value;
		return null;
	},

	"get": function ( conf ) {
		return conf._val;
	},

	"set": function ( conf, val ) {
		conf._val = val;
	}
} );


FieldTypes.readonly = $.extend( true, {}, DataTable.Editor.models.fieldType, {
	"create": function ( conf ) {
		conf._input = document.createElement('input');
		conf._input.setAttribute('readonly', 'readonly');
		conf._input.id = conf.id;
		return conf._input;
	},

	"get": function ( conf ) {
		return conf._input.value;
	},

	"set": function ( conf, val ) {
		conf._input.value = val;
	},

	"enable": function ( conf ) {
		conf._input.disabled = false;
	},

	"disable": function ( conf ) {
		conf._input.disabled = true;
	}
} );


FieldTypes.text = $.extend( true, {}, DataTable.Editor.models.fieldType, {
	"create": function ( conf ) {
		conf._input = document.createElement('input');
		conf._input.id = conf.id;
		return conf._input;
	},

	"get": function ( conf ) {
		return conf._input.value;
	},

	"set": function ( conf, val ) {
		conf._input.value = val;
	},

	"enable": function ( conf ) {
		conf._input.disabled = false;
	},

	"disable": function ( conf ) {
		conf._input.disabled = true;
	}
} );



FieldTypes.password = $.extend( true, {}, DataTable.Editor.models.fieldType, {
	"create": function ( conf ) {
		conf._input = document.createElement('input');
		conf._input.type = 'password';
		conf._input.id = conf.id;
		return conf._input;
	},

	"get": function ( conf ) {
		return conf._input.value;
	},

	"set": function ( conf, val ) {
		conf._input.value = val;
	},

	"enable": function ( conf ) {
		conf._input.disabled = false;
	},

	"disable": function ( conf ) {
		conf._input.disabled = true;
	}
} );

FieldTypes.textarea = $.extend( true, {}, DataTable.Editor.models.fieldType, {
	"create": function ( conf ) {
		conf._input = document.createElement('textarea');
		conf._input.id = conf.id;
		return conf._input;
	},

	"get": function ( conf ) {
		return conf._input.value;
	},

	"set": function ( conf, val ) {
		conf._input.value = val;
	},

	"enable": function ( conf ) {
		conf._input.disabled = false;
	},

	"disable": function ( conf ) {
		conf._input.disabled = true;
	}
} );


FieldTypes.select = $.extend( true, {}, DataTable.Editor.models.fieldType, {
	"create": function ( conf ) {
		conf._input = document.createElement('select');
		conf._input.id = conf.id;

		for ( var i=0, iLen=conf.ipOpts.length ; i<iLen ; i++ ) {
			conf._input.options[i] = new Option(conf.ipOpts[i].label, conf.ipOpts[i].value);
		}
		return conf._input;
	},

	"get": function ( conf ) {
		return $(conf._input).val();
	},

	"set": function ( conf, val ) {
		$(conf._input).val( val );
	},

	"enable": function ( conf ) {
		conf._input.disabled = false;
	},

	"disable": function ( conf ) {
		conf._input.disabled = true;
	}
} );


FieldTypes.checkbox = $.extend( true, {}, DataTable.Editor.models.fieldType, {
	"create": function ( conf ) {
		conf._input = document.createElement('div');

		for ( var i=0, iLen=conf.ipOpts.length ; i<iLen ; i++ ) {
			var container = document.createElement('div');
			var checkbox = document.createElement('input');
			var label = document.createElement('label');

			label.innerHTML = conf.ipOpts[i].label;
			label.setAttribute('for', conf.id+'_'+i);

			checkbox.id = conf.id+'_'+i;
			checkbox.type = 'checkbox';
			checkbox.value = conf.ipOpts[i].value!==undefined ? conf.ipOpts[i].value : conf.ipOpts[i].label;

			container.appendChild( checkbox );
			container.appendChild( label );
			conf._input.appendChild( container );
		}
		return conf._input;
	},

	"get": function ( conf ) {
		var out = [];
		$('input:checked', conf._input).each( function () {
			out.push( this.value );
		} );
		return out.join('|');
	},

	"set": function ( conf, val ) {
		var jqInputs = $('input', conf._input);
		if ( ! $.isArray(val) ) {
			val = val.split('|');
		}

		jqInputs.each( function () {
			for ( var i=0, iLen=val.length ; i<iLen ; i++ ) {
				if ( this.value === val[i] ) {
					this.checked = true;
				}
			}
		} );
	},

	"enable": function ( conf ) {
		$('input', conf._input).attr('disabled', false);
	},

	"disable": function ( conf ) {
		$('input', conf._input).attr('disabled', true);
	}
} );


FieldTypes.radio = $.extend( true, {}, DataTable.Editor.models.fieldType, {
	"create": function ( conf ) {
		conf._input = document.createElement('div');

		for ( var i=0, iLen=conf.ipOpts.length ; i<iLen ; i++ ) {
			var container = document.createElement('div');
			var radio = document.createElement('input');
			var label = document.createElement('label');

			label.innerHTML = conf.ipOpts[i].label;
			label.setAttribute('for', conf.id+'_'+i);

			radio.id = conf.id+'_'+i;
			radio.type = 'radio';
			radio.value = conf.ipOpts[i].value!==undefined ? conf.ipOpts[i].value : conf.ipOpts[i].label;
			radio.name = conf.name;

			container.appendChild( radio );
			container.appendChild( label );
			conf._input.appendChild( container );
		}
		return conf._input;
	},

	"get": function ( conf ) {
		return $('input:checked', conf._input).val();
	},

	"set": function ( conf, val ) {
		$('input', conf._input).each( function () {
			if ( this.value == val ) {
				this.checked = true;
			}
		} );
	},

	"enable": function ( conf ) {
		$('input', conf._input).attr('disabled', false);
	},

	"disable": function ( conf ) {
		$('input', conf._input).attr('disabled', true);
	}
} );


FieldTypes.date = $.extend( true, {}, DataTable.Editor.models.fieldType, {
	/*
	 * Requires jQuery UI
	 */
	"create": function ( conf ) {
		conf._input = document.createElement('input');
		conf._input.id = conf.id;

		if ( ! conf.dateFormat ) {
			conf.dateFormat = $.datepicker.RFC_2822;
		}

		if ( ! conf.dateImage ) {
			conf.dateImage = "../media/images/calender.png";
		}

		$(this).bind('onInitComplete', function () {
			$( conf._input ).datepicker({
				showOn: "both",
				dateFormat: conf.dateFormat,
				buttonImage: conf.dateImage,
				buttonImageOnly: true
			});
			$('#ui-datepicker-div').css('display','none');
		} );

		return conf._input;
	},

	"get": function ( conf ) {
		return conf._input.value;
	},

	"set": function ( conf, val ) {
		$(conf._input).datepicker( "setDate" , val );
	},

	"enable": function ( conf ) {
		$(conf._input).datepicker( "enable" );
	},

	"disable": function ( conf ) {
		$(conf._input).datepicker( "disable" );
	}
} );



/**
 * Name of this class
 *  @constant CLASS
 *  @type     String
 *  @default  DataTable.Editor
 */
DataTable.Editor.prototype.CLASS = "DataTable.Editor";


/**
 * DataTables Editor version
 *  @constant  DataTable.Editor.VERSION
 *  @type      String
 *  @default   See code
 *  @static
 */
DataTable.Editor.VERSION = "1.0.0";
DataTable.Editor.prototype.VERSION = DataTable.Editor.VERSION;


// Event documentation for JSDoc
/**
 * Processing event, fired when Editor submits data to the server for processing.
 * This can be used to provide your own processing indicator if your UI framework
 * already has one.
 *  @name DataTable.Editor#onProcessing
 *  @event
 *  @param {event} e jQuery event object
 *  @param {boolean} processing Flag for if the processing is running (true) or
 *    not (false).
 */

/**
 * Form displayed event, fired when the form is made available in the DOM. This
 * can be useful for fields that require height and width calculations to be
 * performed since the element is not available in the document until the
 * form is displayed.
 *  @name DataTable.Editor#onOpen
 *  @event
 *  @param {event} e jQuery event object
 */

/**
 * Form hidden event, fired when the form is removed from the document. The 
 * of the compliment onOpen event.
 *  @name DataTable.Editor#onClose
 *  @event
 *  @param {event} e jQuery event object
 */

/**
 * Pre-submit event for the form, fired just before the data is submitted to
 * the server. This event allows you to modify the data that will be submitted
 * to the server. Note that this event runs after the 'formatdata' callback
 * function of the {@link DataTable.Editor#submit} API method.
 *  @name DataTable.Editor#onPreSubmit
 *  @event
 *  @param {event} e jQuery event object
 *  @param {object} data The data object that will be submitted to the server
 */

/**
 * Post-submit event for the form, fired immediately after the data has been
 * loaded by the Ajax call, allowing modification or any other interception
 * of the data returned form the server.
 *  @name DataTable.Editor#onPostSubmit
 *  @event
 *  @param {event} e jQuery event object
 *  @param {object} json The JSON object returned from the server
 *  @param {object} data The data object that was be submitted to the server
 */

/**
 * Submission complete event, fired when data has been submitted to the server and
 * after any of the return handling code has been run (updating the DataTable
 * for example). Note that unlike onSubmitSuccess and onSubmitError, onSubmitComplete
 * will be fired for both a successful submission and an error. Additionally this
 * event will be fired after onSubmitSuccess or onSubmitError.
 *  @name DataTable.Editor#onSubmitComplete
 *  @event
 *  @param {event} e jQuery event object
 *  @param {object} json The JSON object returned from the server
 *  @param {object} data The data that was used to update the DataTable
 */

/**
 * Submission complete and successful event, fired when data has been successfully 
 * submitted to the server and all actions required by the returned data (inserting
 * or updating a row) have been completed.
 *  @name DataTable.Editor#onSubmitSuccess
 *  @event
 *  @param {event} e jQuery event object
 *  @param {object} json The JSON object returned from the server
 *  @param {object} data The data that was used to update the DataTable
 */

/**
 * Submission complete, but in error event, fired when data has been submitted to 
 * the server but an error occurred on the server (typically a JSON formatting error)
 *  @name DataTable.Editor#onSubmitError
 *  @event
 *  @param {event} e jQuery event object
 *  @param {object} xhr The Ajax object
 *  @param {string} err The error message from jQuery
 *  @param {object} thrown The exception thrown by jQuery
 *  @param {object} data The data that was used to update the DataTable
 */

/**
 * Pre-create new row event, fired just before DataTables calls the fnAddData method
 * to add new data to the DataTable, allowing modification of the data that will be
 * used to insert into the table.
 *  @name DataTable.Editor#onPreCreate
 *  @event
 *  @param {event} e jQuery event object
 *  @param {object} json The JSON object returned from the server
 *  @param {object} data The data that will be used to update the DataTable
 */

/**
 * Create new row event, fired when a new row has been created in the DataTable by
 * a form submission. This is called just after the fnAddData call to the DataTable.
 *  @name DataTable.Editor#onCreate
 *  @event
 *  @param {event} e jQuery event object
 *  @param {object} json The JSON object returned from the server
 *  @param {object} data The data that was used to update the DataTable
 */

/**
 * As per the onCreate event - included for naming consistency.
 *  @name DataTable.Editor#onPostCreate
 *  @event
 *  @param {event} e jQuery event object
 *  @param {object} json The JSON object returned from the server
 *  @param {object} data The data that was used to update the DataTable
 */

/**
 * Pre-edit row event, fired just before DataTables calls the fnUpdate method
 * to edit data in a DataTables row, allowing modification of the data that will be
 * used to update the table.
 *  @name DataTable.Editor#onPreEdit
 *  @event
 *  @param {event} e jQuery event object
 *  @param {object} json The JSON object returned from the server
 *  @param {object} data The data that will be used to update the DataTable
 */

/**
 * Edit row event, fired when a row has been edited in the DataTable by a form
 * submission. This is called just after the fnUpdate call to the DataTable.
 *  @name DataTable.Editor#onEdit
 *  @event
 *  @param {event} e jQuery event object
 *  @param {object} json The JSON object returned from the server
 *  @param {object} data The data that was used to update the DataTable
 */

/**
 * As per the onEdit event - included for naming consistency.
 *  @name DataTable.Editor#onPostEdit
 *  @event
 *  @param {event} e jQuery event object
 *  @param {object} json The JSON object returned from the server
 *  @param {object} data The data that was used to update the DataTable
 */

/**
 * Pre-remove row event, fired just before DataTables calls the fnDeleteRow method
 * to delete a DataTables row.
 *  @name DataTable.Editor#onPreRemove
 *  @event
 *  @param {event} e jQuery event object
 *  @param {object} json The JSON object returned from the server
 */

/**
 * Row removed event, fired when a row has been removed in the DataTable by a form
 * submission. This is called just after the fnDeleteRow call to the DataTable.
 *  @name DataTable.Editor#onRemove
 *  @event
 *  @param {event} e jQuery event object
 *  @param {object} json The JSON object returned from the server
 */

/**
 * As per the onPostRemove event - included for naming consistency.
 *  @name DataTable.Editor#onPostRemove
 *  @event
 *  @param {event} e jQuery event object
 *  @param {object} json The JSON object returned from the server
 */

/**
 * Set data event, fired when the data is gathered from the form to be used
 * to update the DataTable. This is a "global" version of onPreCreate, onPreEdit
 * and onPreRemove and can be used to manipulate the data that will be added
 * to the DataTable for all three actions
 *  @name DataTable.Editor#onPostRemove
 *  @event
 *  @param {event} e jQuery event object
 *  @param {object} json The JSON object returned from the server
 *  @param {object} data The data that will be used to update the DataTable
 *  @param {string} action The action being performed by the form - 'create',
 *    'edit' or 'remove'.
 */

/**
 * Initialisation of the Editor instance has been completed.
 *  @name DataTable.Editor#onInitComplete
 *  @event
 *  @param {event} e jQuery event object
 */


}(window, document, undefined, jQuery, jQuery.fn.dataTable));

