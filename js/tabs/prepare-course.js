var in_prepare_course = false;
var prepare_course_edit = false;

$(document).ready(function(){
  // Protection contre la fermeture de la préparation de la course non voulue
  $('.ui-tabs-nav a').click(function(){
    if (in_prepare_course == true && prepare_course_edit == true) {
      if (confirm('Vous avez quitté la page de préparation de course mais vous n\'aviez pas enregistré vos données.\nSouhaitez-vous enregistrez les données ?')) {
        $('button.save-course').click();
      }
    }
    
    if (in_prepare_course == false && $(this).attr('href') == '#prepare-course') {
      in_prepare_course = true;
      prepare_course_edit = false;
    }
    
    if ($(this).attr('href') != '#prepare-course') {
      in_prepare_course = false;
    }
  });
  
  database.ready(function(){
    $('a[href="#prepare-course"]').click(function(){
      // préparation de la liste déroulante pour les courses
      $('#select-course').html('<option value=""></option>');
      database.getAll(['course'], function(data) {
        $('#select-course').html($('#select-course').html() + '<option value="' + data.DT_RowId + '">' + data.name + '</option>');
      });
      
      // On met à zéro la table
      $('.select-participant').html('');
      
      // On cache le bouton de sauvegarde
      $('.save-course').hide();
    });
    
    $('#select-course').change(function(){
      // On affiche le bouton de sauvegarde
      $('.save-course').show();
      
      // On récupère l'identifiant de la course
      var id_course = $(this).find('option:selected').val();
      
      if (id_course == '') {
        $('a[href="#prepare-course"]').click();
        return;
      }
      
      // On récupère les participants déjà sélectionné
      database.get(['course'], id_course, function(course) {
        // préparation de la liste pour les participants
        var participantId = 'table_' + course.DT_RowId;
        var participantHtml = '';
        var participantHead = '<tr><th>Participant</th><th>Catégorie</th><th>Dossard</th><th>Chien</th></tr>';
        participantHtml = '<table id="' + participantId + '"><thead>' + participantHead + '</thead><tfoot>' + participantHead + '</tfoot>';
        $('.select-participant').html(participantHtml);
        
        database.getAllJSON(['participant'], function(datas) {
          var participants = [];
          
          for (var i = 0; i < datas.length; i++) {
            // Le participant est-il déjà sélectionné ?
            var selected = isSelected(course, datas[i].DT_RowId);
            
            var checked = '';
            var dossard = '';
            var chien   = '';
            
            if (selected) {
              dossard = selected.dossard;
              chien   = selected.chien;
            }
            
            participants.push({
              participant : datas[i].lastname + ' ' + datas[i].firstname,
              categorie   : datas[i].categorie,
              dossard     : '<input type="text" value="' + dossard + '" name="dossard[' + datas[i].DT_RowId + ']">',
              chien       : '<input type="text" value="' + chien + '" name="chien[' + datas[i].DT_RowId + ']">'
            });
          }
          
          $('#' + participantId).dataTable({
            "sDom":  'Tfrtip',
            "aaData": participants,
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
            "aoColumns": [{
                          "mDataProp": "participant"
                          }, {
                          "mDataProp": "categorie"
                          }, {
                          "mDataProp": "dossard"
                          }, {
                          "mDataProp": "chien"
                         }],
            "oTableTools": {
                          "sSwfPath": "swf/copy_csv_xls_pdf.swf",
                          "aButtons": [],
                          "fnRowDeselected": function(node){
                            $(node).find('input[type=checkbox]').removeAttr('checked');
                          },
                          "fnRowSelected": function(node){
                            $(node).find('input[type=checkbox]').attr('checked', 'checked');
                          }
                      }
          });
        });
      });
      
    });
    
    var input_value_edit_participant;
    
    $('#prepare-course .select-participant input:text')
      .live('focus', function(){
        input_value_edit_participant = $(this).val();
      })
      .live('blur', function(){
        var value = input_value_edit_participant;
        if (value != $(this).val()) {
          prepare_course_edit = true;
        }
      })
    
    $('button.save-course').click(function(){
      var participants_to_save = [];
      //var nb_items_to_save = $('#prepare-course .select-participant input[type=checkbox]:checked').length;
      var nb_items_to_save = $('#prepare-course .select-participant input:text[name^=dossard][value!=""]').length;
      var nb_item_saved = 0;
      
      prepare_course_edit = false;
      
      $('#prepare-course .select-participant input:text[name^=dossard][value!=""]').each(function(){
        var id = $(this).attr('name').replace(/dossard\[(.*)\]/, "$1");
        var chien = $('input[name="chien[' + id + ']"]').val();
        var dossard = $('input[name="dossard[' + id + ']"]').val();
        
        database.get(['participant'], id, function(participant) {
          nb_item_saved++;
          
          database.search(
            ['categorie'],
            'name',
            participant.categorie,
            function(categorie){
              participants_to_save.push({
                id        : participant.DT_RowId,
                lastname  : participant.lastname,
                firstname : participant.firstname,
                club      : participant.club,
                categorie : categorie,
                chien     : chien,
                dossard   : dossard
              });
            },
            function(){
              if (nb_item_saved == nb_items_to_save) {
                var course_id = $('#prepare-course .select-participant table').attr('id').replace('table_', '');
                database.get(['course'], course_id, function(course){
                  database.update(
                    ['course'],
                    course.DT_RowId,
                    {
                      DT_RowId        : course.DT_RowId,
                      name            : course.name,
                      width           : course.width,
                      start           : course.start,
                      time            : course.time,
                      nb_participants : participants_to_save.length,
                      participants    : participants_to_save
                    },
                    function(){
                      showInfo('La course a bien été enregistrée');
                    },
                    function(){
                      showError('Une erreur est survenue lors de l\'enregistrement de la course');
                    }
                  );
                });
              }
            }
          );
        });
      });
    });
  });
});