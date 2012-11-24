$(document).ready(function(){
  database.ready(function(){
    $('a[href="#result"]').click(function(){
      // préparation de la liste déroulante pour les courses
      $('#select-result-course').html('<option value=""></option>');
      database.getAll(['course'], function(data) {
        $('#select-result-course').html($('#select-result-course').html() + '<option value="' + data.DT_RowId + '">' + data.name + '</option>');
      });
      
      // On met à zéro la table
      $('.resultat-participant').html('');
      
      // On cache le bouton de sauvegarde
      $('.save-resultat').hide();
      $('.calcul-result').hide();
    });
    
    $('#select-result-course').change(function(){
      // On cache le bouton de sauvegarde
      $('.save-resultat').show();
      
      // On récupère l'identifiant de la course
      var id_course = $(this).find('option:selected').val();
      
      if (id_course == '') {
        $('a[href="#result"]').click();
        return;
      }
      
      // On remet la table à zéro
      $('.resultat-participant').html('');
      
      // mise en place de l'éditeur
      editor_resultat = new $.fn.dataTable.Editor({
        'domTable': '#result .resultat-participant table',
        'fields'  : [{
                      'label' : 'Ordre d\'arrivée',
                      'name'  : 'ordre_arrivee'
                    }, {
                      'label' : 'Dossard',
                      'name'  : 'dossard'
                    }, {
                      'label' : 'Participant',
                      'name'  : 'participant'
                    }, {
                      'label' : 'Club',
                      'name'  : 'club'
                    }, {
                      'label' : 'Chien',
                      'name'  : 'chien'
                    }, {
                      'label' : 'Temps',
                      'name'  : 'temps'
                    }, {
                      'label' : 'Pénalité',
                      'name'  : 'penalite'
                    }, {
                      'label' : 'Catégorie',
                      'name'  : 'categorie'
                    }, {
                      'label' : 'Clt scratch',
                      'name'  : 'classement_scratch'
                    }, {
                      'label' : 'Clt par catégorie',
                      'name'  : 'classement_categorie'
                    }, {
                      'label' : 'Clt par sexe',
                      'name'  : 'classement_sex'
                    }, {
                      'label' : 'Moyenne',
                      'name'  : 'moyenne'
                    }],
        'ajax'    : function (url, data, successCallback, errorCallback) {
                      var id = null;
                      if ( data.action == 'remove' ) {
                        for (var i = 0, iLen = data.data.length; i < iLen; i++) {
                          database.remove(['resultat'], data.data[i]);
                        }
                      }
                      successCallback( {"id": id} );
                    }
      });
      
      // On récupère les participants déjà sélectionné
      database.get(['course'], id_course, function(course) {
        // préparation de la liste pour les participants
        var participantId = 'result_' + course.DT_RowId;
        var participantHtml = '';
        var participantHead = '<tr><th class="no-print">Ordre d\'arrivée</th><th>Dossard</th><th>Participant</th><th>Club</th><th>Chien</th><th>Temps</th><th>Pénalité</th><th>Catégorie</th><th>Clt scratch</th><th>Clt par catégorie</th><th>Clt par sexe</th><th>Moyenne</th></tr>';
        participantHtml = '<table id="' + participantId + '"><thead>' + participantHead + '</thead><tfoot>' + participantHead + '</tfoot>';
        $('.resultat-participant').html(participantHtml);
        
        var resultats = [];
        
        database.search(
          ['resultat'],
          'course_id',
          course.DT_RowId,
          function(resultat){
            if (resultat.dossard == -1) {
              resultats.push({
                DT_RowId: resultat.DT_RowId,
                ordre_arrivee: resultat.ordre_arrivee,
                dossard: '<input type="text" name="resultat[' + resultat.DT_RowId + ']" value="">',
                participant: 'N/A',
                club : 'N/A',
                chien : 'N/A',
                temps : msToHour(resultat.fin),
                penalite : 'N/A',
                categorie : 'N/A',
                classement_scratch   : 'N/A',
                classement_categorie : 'N/A',
                classement_sex : 'N/A',
                moyenne : 'N/A'
              });
            } else {
              resultats.push({
                DT_RowId: resultat.DT_RowId,
                ordre_arrivee: resultat.ordre_arrivee,
                dossard: '<input type="text" name="resultat[' + resultat.DT_RowId + ']" value="' + resultat.dossard + '">',
                participant: resultat.participant.lastname + ' ' + resultat.participant.firstname,
                club : resultat.participant.club,
                chien : resultat.participant.chien,
                temps : resultat.temps_str,
                penalite : resultat.penalite,
                categorie : resultat.participant.categorie.name,
                classement_scratch: resultat.classement_scratch,
                classement_categorie : resultat.classement_categorie,
                classement_sex : resultat.classement_sex,
                moyenne : getMoyenneKmH(resultat.temps, course.width)
              });
            }
          },
          function(){
            $('#' + participantId).dataTable({
              "sDom":  'Tfrtip',
              "aaData": resultats,
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
                            "mDataProp": "ordre_arrivee"
                            }, {
                            "mDataProp": "dossard"
                            }, {
                            "mDataProp": "participant"
                            }, {
                            "mDataProp": "club"
                            }, {
                            "mDataProp": "chien"
                            }, {
                            "mDataProp": "temps"
                            }, {
                            "mDataProp": "penalite"
                            }, {
                            "mDataProp": "categorie"
                            }, {
                            "mDataProp": "classement_scratch"
                            }, {
                            "mDataProp": "classement_categorie"
                            }, {
                            "mDataProp": "classement_sex"
                            }, {
                            "mDataProp": "moyenne"
                            }],
              "oTableTools": {
                            "sSwfPath": "swf/copy_csv_xls_pdf.swf",
                            "sRowSelect": "single",
                            "aButtons": [
                              {
                                "sExtends": "text",
                                "sButtonText": "Un oubli ?",
                                "fnClick": showAddParticipantToResultat
                              },
                              {
                                "sExtends": "text",
                                "sButtonText": "Ajouter une pénalité",
                                "fnClick": showAddPenalite
                              },
                              {
                                "sExtends": "editor_remove",
                                "editor": editor_resultat,
                                "sButtonText": "Supprimer",
                                "formTitle": "Supprimer un résultat"
                              }
                            ]
                        }
            });
            
            if ($('.resultat-participant input[name^=resultat][value=""]').length == 0) {
              $('.calcul-result').show();
            }
          }
        );
      });
    });
    
    $('.save-resultat').click(function(){
      var all_completed = true;
      var nb_items = $('.resultat-participant input[name^=resultat]').length;
      var i = 0;
      
      $('.resultat-participant input[name^=resultat]').each(function(){
        if ($.trim($(this).val()) == '') {
          all_completed = false;
        } else {
          if (i + 1 < nb_items) {
            completeResultat($(this).attr('name').replace(/resultat\[(.*)\]/, "$1"), $(this).val());
          } else {
            completeResultat($(this).attr('name').replace(/resultat\[(.*)\]/, "$1"), $(this).val(), function(){
              $('#select-result-course').change();
            });
          }
        }
        i++;
      });
      
      showInfo('Les dossards ont bien été enregistrés.');
      $('#select-result-course').change();
    });
    
    $('.calcul-result').click(function(){
      var course_id = $('.resultat-participant table').attr('id').replace('result_', '');
      setClassement(course_id, function(){
        showInfo('Les résultat ont bien été calculés.');
        
        $('#select-result-course').change();
      });
    });
  });
});