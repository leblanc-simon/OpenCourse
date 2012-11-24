var jTable = function(options) {
  var that = {};
  that.name                     = options.name || false;
  that.label                    = options.label || 'None';
  that.genre                    = options.genre || 'masculin';
  that.fields                   = options.fields || {};
  that.data_insert              = options.data_insert || function(id, data){return data;};
  that.data_update              = options.data_update || function(data){return data;};
  that.preprocess_load          = options.preprocess_load || undefined;
  that.additionnal_buttons      = options.additionnal_buttons || [];
  that.without_standard_button  = options.without_standard_button || false;
  
  that.function_insert          = options.function_insert || undefined;
  that.function_update          = options.function_update || undefined;
  
  that.editor = null;
  
  that.generateEditor = function() {
    that.editor = new $.fn.dataTable.Editor({
                    'domTable': '#' + that.name + ' table.data-table',
                    'fields'  : that.fields,
                    'ajax'    : function (url, data, successCallback, errorCallback) {
                      var id = null;
                      
                      if (data.action === 'create') {
                        id = 'row_' + uniqid();
                        if (that.function_insert) {
                          that.function_insert(that.name, id, data.data);
                        } else {
                          database.add([that.name], that.data_insert(id, data.data));
                        }
                      } else if (data.action === 'edit') {
                        if (that.function_update) {
                          that.function_update(that.name, data.id, data.data);
                        } else {
                          database.update([that.name], data.id, that.data_update(data.id, data.data));
                        }
                        id = data.id;
                      } else if (data.action === 'remove') {
                        for (var i = 0, iLen = data.data.length; i < iLen; i++) {
                          database.remove([that.name], data.data[i]);
                        }
                      }
                      
                      successCallback({"id": id});
                    }
                  });
  };
  
  that.build = function() {
    if (that.name == false) {
      return false;
    }
    
    // Build generator
    if (that.without_standard_button != true) {
      that.generateEditor();
    }
    
    // Get columns
    var columns = [];
    for (var i = 0, nb_fields = that.fields.length; i < nb_fields; i++) {
      columns.push({"mDataProp": that.fields[i].name});
    }
    
    // Get syntax
    if (that.genre == 'masculin') {
      var adjectif_numeral = 'un';
      var adjectif = 'nouveau';
    } else {
      var adjectif_numeral = 'une';
      var adjectif = 'nouvelle';
    }
    
    // Get standard buttons
    var buttons = [];
    if (that.without_standard_button != true) {
      buttons.push({sExtends: 'editor_create',
                    editor: that.editor,
                    sButtonText: 'Nouveau',
                    formTitle: 'Créer ' + adjectif_numeral + ' ' + adjectif + ' ' + that.label
                    });
      buttons.push({sExtends: 'editor_edit',
                    editor: that.editor,
                    sButtonText: 'Modifier',
                    formTitle: 'Modifier ' + adjectif_numeral + ' ' + that.label
                    });
      buttons.push({sExtends: 'editor_remove',
                    editor: that.editor,
                    sButtonText: 'Supprimer',
                    formTitle: 'Supprimer ' + adjectif_numeral + ' ' + that.label
                    });
    }
    
    // Get additionnal buttons
    for (var i = 0, nb_buttons = that.additionnal_buttons.length; i < nb_buttons; i++) {
      buttons.push(that.additionnal_buttons[i]);
    }
    
    // Load data
    database.ready(function() {
      database.getAllJSON([that.name], function(datas) {
        // Pre-process data if necessary
        if (that.preprocess_load) {
          datas = that.preprocess_load(datas);
        }
        
        $('#' + that.name + ' table.data-table').dataTable({
          "sDom":  'Tfrtip',
          "aaData": datas,
          "iDisplayLength": 1000,
          "oLanguage": {
            "sProcessing":     "Traitement en cours...",
            "sLengthMenu":     "Afficher _MENU_ éléments",
            "sZeroRecords":    "Aucun élément à afficher",
            "sInfo":           "Affichage de l'élement _START_ à _END_ sur _TOTAL_ éléments",
            "sInfoEmpty":      "Affichage de l'élement 0 à 0 sur 0 éléments",
            "sInfoFiltered":   "(filtré de _MAX_ éléments au total)",
            "sInfoPostFix":    "",
            "sSearch":         "Rechercher :",
            "sLoadingRecords": "Téléchargement...",
            "sUrl":            "",
            "oPaginate": {
                "sFirst":    "Premier",
                "sPrevious": "Précédent",
                "sNext":     "Suivant",
                "sLast":     "Dernier"
            }
          },
          "aoColumns": columns,
          "oTableTools": {
                        "sSwfPath": "swf/copy_csv_xls_pdf.swf",
                        "sRowSelect": "single",
                        "aButtons": buttons
                        }
        });
      });
    });
    
    return true;
  };
  
  return that;
};

