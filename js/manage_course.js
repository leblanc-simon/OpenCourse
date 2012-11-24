/**
 * Indique si tous les participants sont arrivés
 *
 * @param   string  course_id   L'identifiant de la course à vérifier
 * @return  bool                Vrai si tous les participants sont arrivés, faux sinon
 */
function isFinished(course_id)
{
  var return_value = false;
  database.get(['course'], course_id, function(course){
    database.count(['resultat'], 'course_id', course_id, function(nb_resultats_for_course){
      if (course.participants.length == nb_resultats_for_course) {
        return_value = true;
      }
    });
    
  });
  
  return return_value;
}


/**
 * Marque un participant comme étant arrivé
 *
 * @param   string  course_id   L'identifiant de la course
 */
function markAsArrive(course_id, dossard, force_fin)
{
  if (force_fin) {
    var fin = force_fin;
    var ordre = 0;
  } else {
    var fin = new Date().getTime();
    var ordre = ordre_arrivee[course_id]++;
  }
  
  database.get(['course'], course_id, function(course){
    var resultat = {
      DT_RowId            : 'row_' + uniqid(),
      participant         : {},
      dossard             : -1,
      course              : course,
      course_id           : course.DT_RowId,
      ordre_arrivee       : ordre,
      classement_scratch  : null,
      classement_categorie: null,
      classement_sex      : null,
      debut               : null,
      fin                 : fin,
      temps               : null,
      temps_str           : null,
      penalite            : 0
    };
    
    var nb_participants_course = course.participants.length;
    
    // Si on a un numéro de dossard, on complète
    if (dossard && $.trim(dossard) != '') {
      var find = false;
      var participants = course.participants;
      
      for (var i =0; i < participants.length; i++) {
        if (participants[i].dossard != dossard) {
          continue;
        }
        
        var temps = resultat.fin - participants[i].debut;
        var str_temps = msToHour(temps);
        
        resultat.dossard      = dossard;
        resultat.participant  = participants[i];
        resultat.debut        = participants[i].debut;
        resultat.temps        = temps;
        resultat.temps_str    = msToHour(temps + (resultat.penalite * 1000));
        
        find = true;
        break;
      }
      
      if (find == false) {
        showError('Le participant n\'a pas été trouvé !');
        return;
      }
    }
    
    database.add(
      ['resultat'],
      resultat,
      function(){
        if (force_fin) {
          showInfo('Le participant a été ajouté. Vous êtes prié de faire plus attention la prochaine fois !!!');
          closeAddParticipantToResultat();
        } else {
          var num_participant = ordre_arrivee[course_id] - 1;
          var participants_restant = nb_participants_course - num_participant;
          var additional_message = '';
          if (participants_restant == 0) {
            additional_message = '<br />La course est finie, vous pouvez reprendre une activité enfin intéressante';
          }
          showInfo('Le ' + num_participant + 'ème participant arrivé est enregistré (sur ' + nb_participants_course + ' : il en reste donc ' + participants_restant + ')' + additional_message);
        }
      },
      function(){
        if (force_fin) {
          showError(':-( une erreur c\'est produite !');
          closeAddParticipantToResultat();
        } else {
          showError(':-( une erreur c\'est produite !');
        }
      }
    );
  });
}


/**
 * Complète les résultats d'une course
 *
 * @param   string  resultat_id   l'identifiant du résultat
 * @param   int     dossard       le numéro de dossard
 */
function completeResultat(resultat_id, dossard, callBackSuccess)
{
  database.get(['resultat'], resultat_id, function(resultat){
    database.get(['course'], resultat.course_id, function(course){
      var find = false;
      var participants = course.participants;
      
      for (var i =0; i < participants.length; i++) {
        if (participants[i].dossard != dossard) {
          continue;
        }
        
        var temps = resultat.fin - participants[i].debut;
        var str_temps = msToHour(temps);
        
        resultat.dossard      = dossard;
        resultat.participant  = participants[i];
        resultat.debut        = participants[i].debut;
        resultat.temps        = temps;
        resultat.temps_str    = msToHour(temps + (resultat.penalite * 1000));
        
        database.update(
          ['resultat'],
          resultat.DT_RowId,
          resultat,
          callBackSuccess,
          function(){}
        );
        
        find = true;
        break;
      }
      
      if (find == false) {
        showError('Le participant n\'a pas été trouvé !');
        return;
      }
    });
  });
}


function setClassement(course_id, callBackFinish)
{
  var tri_temps = function(resultat_a, resultat_b) {
    if ((resultat_a.temps + (resultat_a.penalite * 1000)) < (resultat_b.temps + (resultat_b.penalite * 1000))) {
      return -1;
    } else if ((resultat_a.temps + (resultat_a.penalite * 1000)) > (resultat_b.temps + (resultat_b.penalite * 1000))) {
      return 1
    } else {
      return 0;
    }
  }
  
  var classement_scratch = [];
  var classement_categorie = [];
  var classement_sex = [];
  
  // On construit les tableaux pour les classements
  database.search(
    ['resultat'],
    'course_id',
    course_id,
    function(resultat){
      // Construction du tableau général
      classement_scratch.push(resultat);
      
      // Construction du tableau des catégories
      if (!classement_categorie[resultat.participant.categorie.DT_RowId]) {
        classement_categorie[resultat.participant.categorie.DT_RowId] = []
      }
      classement_categorie[resultat.participant.categorie.DT_RowId].push(resultat);
      
      // Construction du tableau des sexes
      if (!classement_sex[resultat.participant.categorie.sex]) {
        classement_sex[resultat.participant.categorie.sex] = [];
      }
      classement_sex[resultat.participant.categorie.sex].push(resultat);
    },
    function() {
      // On tri par temps
      classement_scratch.sort(tri_temps);
      for (categorie in classement_categorie) {
        classement_categorie[categorie].sort(tri_temps);
      }
      for (sex in classement_sex) {
        classement_sex[sex].sort(tri_temps);
      }
      
      // On enregistre les classements
      for (var i = 0; i < classement_scratch.length; i++) {
        var resultat = classement_scratch[i];
        
        resultat.classement_scratch = i + 1;
        database.update(['resultat'], resultat.DT_RowId, resultat);
      }
      for (categorie in classement_categorie) {
        var length = classement_categorie[categorie].length;
        for (var i = 0; i < length; i++) {
          var resultat = classement_categorie[categorie][i];
          
          resultat.classement_categorie = i + 1;
          database.update(['resultat'], resultat.DT_RowId, resultat);
        }
      }
      for (sex in classement_sex) {
        var length = classement_sex[sex].length;
        for (var i = 0; i < length; i++) {
          var resultat = classement_sex[sex][i];
          
          resultat.classement_sex = i + 1;
          database.update(['resultat'], resultat.DT_RowId, resultat);
        }
      }
      
      if (callBackFinish) {
        callBackFinish();
      }
    }
  );
}


function showAddParticipantToResultat(nButton, oConfig, oFlash)
{
  var course_id = $('#select-result-course').find('option:selected').val();
  var html = $('#tmpl-add-participant').tmpl({ course_id: course_id });
  $('body').append(html);
}


function addParticipantToResultat()
{
  var dossard = $.trim($('#add-dossard').val());
  var temps   = $.trim($('#add-temps').val());
  var course_id = $('#add-course-id').val();
  
  if (temps == '' || !temps.match(/[0-9]{2}:[0-9]{2}:[0-9]{2}/)) {
    showError('Le temps doit être rempli sous la forme 00:00:00 !');
    return;
  }
  
  if (!dossard || dossard == '') {
    showError('Le numéro de dossard, c\'est pas pour les chiens :-) !');
    return;
  }
  
  temps = temps.split(':');
  var temps_in_ms = (parseInt(temps[0] * 60 * 60) + parseInt(temps[1] * 60) + parseInt(temps[2])) * 1000;
  
  database.get(['course'], course_id, function(course){
    var find = false;
    var participants = course.participants;
    
    for (var i =0; i < participants.length; i++) {
      if (participants[i].dossard != dossard) {
        continue;
      }
      
      var fin = participants[i].debutdebut + temps_in_ms
      
      find = true;
      break;
    }
    
    if (find == true) {
      markAsArrive(course_id, dossard, fin);
      return; 
    }
    
    showError('Le numéro de dossard ne correspond à aucun participant. En plus de ne pas savoir cliquer au bon moment, vous n\'êtes pas foutu d\'entrer un bon numéro de dossard !!! !');
    return;
  });
}

function closeAddParticipantToResultat()
{
  $('#add-participant-to-result').remove();
  $('#add-participant-to-result-bg').remove();
  
  $('#select-result-course').change();
}


function showAddPenalite()
{
  var course_id = $('#select-result-course').find('option:selected').val();
  var html = $('#tmpl-add-penalite').tmpl({ course_id: course_id });
  $('body').append(html);
  $('#penalite-dossard').focus();
}

function addPenalite()
{
  var dossard   = $.trim($('#penalite-dossard').val());
  var penalite  = $.trim($('#penalite-temps').val());
  var course_id = $('#penalite-course-id').val();
  
  if (penalite == '' || !penalite.match(/[0-9]+/)) {
    showError('La penalité doit être un nombre !');
    return;
  }
  
  if (!dossard || dossard == '') {
    showError('Le numéro de dossard, c\'est pas pour les chiens :-) !');
    return;
  }
  
  penalite = parseInt(penalite);
  
  database.get(['course'], course_id, function(course){
    var find = false;
    var participants = course.participants;
    
    for (var i =0; i < participants.length; i++) {
      if (participants[i].dossard != dossard) {
        continue;
      }
      
      database.search(['resultat'], 'course_id', course_id, function(resultat) {
        if (resultat.dossard == dossard) {
          resultat.penalite  = penalite;
          resultat.temps_str = msToHour(resultat.temps + (resultat.penalite * 1000));
          database.update(
            ['resultat'],
            resultat.DT_RowId,
            resultat,
            function(){
              showInfo('La pénalité du délinquant a été ajoutée.');
              $('#penalite-dossard').val('');
              $('#penalite-temps').val('');
            },
            function(){
              showError('Il y a eu une erreur lors de l\'enregistrement de la pénalité.');
            }
          );
        }
      });
      
      find = true;
      break;
    }
    
    if (find == true) {
      return; 
    }
    
    showError('Le numéro de dossard ne correspond à aucun participant. Soyez un peu concentré !!!');
    return;
  });
}

function closeAddPenalite()
{
  $('#add-penalite').remove();
  $('#add-penalite-bg').remove();
  
  $('#select-result-course').change();
}

function printPreparationCourse()
{  
  var buildTable = function(participants, course) {
    var table = $('#tmpl-print-course').tmpl({ course: course, participants: participants });
    
    return table;
  };
  
  var course_selected = null;
  if ($('#course table.data-table tr.DTTT_selected').length == 1) {
    course_selected= $('#course table.data-table tr.DTTT_selected').attr('id');
  }
  
  database.getAllJSON(['course'], function(courses) {
    var html = document.createElement('div');
    html.setAttribute('class', 'printing');
    $(html).append('<div class="return" onclick="$(\'.printing\').remove();">Retour</div>');
    
    for (var i = 0; i < courses.length; i++) {
      if (course_selected != null) {
        if (courses[i].DT_RowId != course_selected) {
          continue;
        }
      }
      
      var participants = courses[i].participants;
      
      if (!participants || participants.length == 0) {
        continue;
      }
      
      // Tri des participants par numéro de dossard
      participants.sort(function(a, b) {
        try {
          dossard_a = parseInt(a.dossard);
          dossard_b = parseInt(b.dossard);
        } catch (e) {
          return -1;
        }
        
        if (dossard_a < dossard_b) {
          return -1;
        } else if (dossard_a > dossard_b) {
          return 1
        } else {
          return 0;
        }
      });
      
      $(html).append(buildTable(participants, courses[i]));
    }
    
    // On remplace le contenu de la page
    $('body').append(html);
  });
}