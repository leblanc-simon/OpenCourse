$(document).ready(function(){
  database.ready(function(){
    $('a[href="#result-insert"]').click(function(){
      // préparation de la liste déroulante pour les courses
      $('#select-result-insert-course').html('<option value=""></option>');
      database.getAll(['course'], function(data) {
        $('#select-result-insert-course').html($('#select-result-insert-course').html() + '<option value="' + data.DT_RowId + '">' + data.name + '</option>');
      });
      
      // On met à zéro la table
      $('.resultat-participant').html('');
      
      // On cache le bouton de sauvegarde
      $('.save-resultat').hide();
      $('.calcul-result').hide();
    });
  
    $('#select-result-insert-course').change(function(){
      // On cache le bouton de sauvegarde
      $('.save-resultat').show();
      
      // On récupère l'identifiant de la course
      var id_course = $(this).find('option:selected').val();
      
      if (id_course == '') {
        $('a[href="#result-insert"]').click();
        return;
      }
      
      // On remet la table à zéro
      $('.resultat-insert-participant').html('');
      
      // mise en place de l'éditeur
      editor_resultat = new $.fn.dataTable.Editor({
        'domTable': '#result-insert .resultat-insert-participant table',
        'fields'  : [{
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
      
      // On lance la course
      database.get(['course'], id_course, function(course) {
        // On vérifie si la course a déjà été lancé
        if (!course.participants || !course.nb_participants || course.nb_participants <= 0
            || !course.participants[0] || !course.participants[0].debut)
        {
          launchCourse(course);
          buildFakeResultat(course);
        }
        
        
        // préparation de la liste pour les participants
        var participantId = 'result_insert_' + course.DT_RowId;
        var participantHtml = '';
        var participantHead = '<tr><th>Dossard</th><th>Participant</th><th>Club</th><th>Chien</th><th>Temps</th><th>Pénalité</th><th>Catégorie</th><th>Clt scratch</th><th>Clt par catégorie</th><th>Clt par sexe</th><th>Moyenne</th></tr>';
        participantHtml = '<table id="' + participantId + '"><thead>' + participantHead + '</thead><tfoot>' + participantHead + '</tfoot>';
        $('#result-insert .resultat-insert-participant').html(participantHtml);
        
        var resultats = [];
        
        database.search(
          ['resultat'],
          'course_id',
          course.DT_RowId,
          function(resultat){
            if (resultat.dossard == -1) {
              resultats.push({
                DT_RowId: resultat.DT_RowId,
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
                dossard: resultat.dossard,
                participant: resultat.participant.lastname + ' ' + resultat.participant.firstname,
                club : resultat.participant.club,
                chien : resultat.participant.chien,
                temps : '<input type="text" name="temps[' + resultat.DT_RowId + ']" data-resultat-id="' + resultat.DT_RowId + '" value="' + resultat.temps_str + '">',
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
                                "sButtonText": "Ajouter une pénalité",
                                "fnClick": showAddPenaliteInsert
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
            
            if ($('.resultat-insert-participant input[name^=resultat][value=""]').length == 0) {
              $('.calcul-insert-result').show();
            }
          }
        );
      });
    });
    
    $('.save-insert-resultat').click(function(){
      $('.resultat-insert-participant input[name^=temps]').each(function(){
        temps = $(this).val();
        resultat_id = $(this).attr('data-resultat-id');
        saveResultat(resultat_id, temps);
        console.log(temps);
        console.log(resultat_id);
      });
    });
    
    $('.calcul-insert-result').click(function(){
      var course_id = $('.resultat-insert-participant table').attr('id').replace('result_insert_', '');
      setClassement(course_id, function(){
        showInfo('Les résultat ont bien été calculés.');
        
        $('#select-result-insert-course').change();
      });
    });
  });
});