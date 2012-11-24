// gestion de la base de données "course"
var database = new indexedDBClosure({
  name: "open-course3",
  version: 1,
  tables: [
    {name : 'course',       key : 'DT_RowId'},
    {name : 'participant',  key : 'DT_RowId'},
    {name : 'categorie',    key : 'DT_RowId', indexes : [{ name : 'name', key : 'name' }] },
    {name : 'resultat',     key : 'DT_RowId', indexes : [{ name : 'course_id', key : 'course_id' }, { name : 'dossard', key : 'dossard' } ] }
  ]
});

var ordre_arrivee = [];

var is_canicross = false;

var timeout_alert = null;

/**
 * Cache l'alerte
 */
function hideAlert()
{
  timeout_alert = null;
  
  $('.alert').fadeOut(400, function() {
    $('.alert').html('').removeClass('margin-30');
  });
}


/**
 * Affiche une erreur
 */
function showError(error)
{
  clearTimeout(timeout_alert);
  
  var html = $('#tmpl-alert-error').tmpl({ error: error });
  
  $('.alert').show().html(html).addClass('margin-30');
  
  timeout_alert = setTimeout(hideAlert, 3000);
}


/**
 * Affiche une information
 */
function showInfo(info)
{
  clearTimeout(timeout_alert);
  
  var html = $('#tmpl-alert-info').tmpl({ info: info });
  
  $('.alert').show().html(html).addClass('margin-30');
  
  timeout_alert = setTimeout(hideAlert, 3000);
}


/**
 * Indique si un participant est déjà sélectionné pour une course
 */
function isSelected(course, participant_id)
{
  var participants = course.participants;
  
  for (var i = 0; i < participants.length; i++) {
    if (participant_id == participants[i].id) {
      return participants[i];
    }
  }
  
  return false;
}

function getTimeToStart(course, iterator)
{
  return msToHour(course.start + (parseInt(course.time) * iterator * 1000));
}

/**
 * Lance une course
 */
function launchCourse(course)
{
  // Heure de départ
  var depart = new Date().getTime();
  
  // Classement scratch
  ordre_arrivee[course.DT_RowId] = 1;
  
  // Délai entre le participants
  try {
    var delai = parseInt(course.time);
  } catch (e) {
    showError('Une erreur s\'est produite lors du lancement de la course : impossible de récupérer le délai');
    return false;
  }
  
  // Récupération des participants
  var participants = course.participants;
  
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
  
  // On indique l'heure de départ pour chaque participant
  var participants_to_save = [];
  for (var i = 0; i < participants.length; i++) {
    var tmp_depart = depart + (i * delai * 1000);
    
    participants_to_save.push({
      id        : participants[i].id,
      lastname  : participants[i].lastname,
      firstname : participants[i].firstname,
      club      : participants[i].club,
      categorie : participants[i].categorie,
      chien     : participants[i].chien,
      dossard   : participants[i].dossard,
      debut     : tmp_depart,
      debutdebut: depart // variable correspondant au début de la course mais pas au départ du participant (ça n'a rien à foutre là, mais c'est plus simple à gérer)
    });
  }
  
  // On met à jour la course avec les temps de départ
  console.log(participants_to_save);
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
    }
  );
  
  return true;
}


/**
 * Enregistre l'arrivée d'un participant
 */
function arriveeDossard(course_id, dossard)
{
  fin = new Date();
  database.get(['course'], course_id, function(course) {
    var participants = course.participants;
    
    var timeToShow;
    
    find = false;
    for (var i =0; i < participants.length; i++) {
      if (participants[i].dossard != dossard) {
        continue;
      }
      
      var temps = fin.getTime() - participants[i].debut;
      var str_temps = msToHour(temps);
      
      participants[i].fin       = fin.getTime();
      participants[i].temps     = temps;
      participants[i].str_temps = str_temps;
      timeToShow = str_temps;
      find = true;
      break;
    }
    
    if (find == false) {
      showError('Le participant n\'a pas été trouvé !');
      return;
    }
    
    console.log(participants);
    database.update(
      ['course'],
      course_id,
      {
        DT_RowId        : course.DT_RowId,
        name            : course.name,
        width           : course.width,
        start           : course.start,
        time            : course.time,
        nb_participants : course.nb_participants,
        participants    : participants
      },
      function() {
        showInfo('Temps enregistré pour le dossard <strong>' + dossard + '</strong> : <strong>' + timeToShow + '</strong>');
      },
      function() {
        showError('Une erreur s\'est produite lors de l\'enregistrement du temps du dossard <strong>' + dossard + '</strong> !');
      }
    );
  });
}

/**
 * Fonction executé lorsque le clic sur l'arrivé d'un participant ou lorsque l'on clic sur espace
 */
function clickOrSpaceForMarkAsArrived()
{
  var course_id = $('#course-launched input[name=id_course]').val();
  var dossard   = $('#num-dossard').val();
  
  markAsArrive(course_id, dossard);
  
  $('#num-dossard').val('');
  $('#num-dossard').focus();
}

function activateSpaceForMarkAsArrived()
{
  $(document).bind('keypress', function(event){
    if (event.which == 32) { // 32 = space
      clickOrSpaceForMarkAsArrived();
      return false;
    }
    
    return true;
  });
}


function desactivateSpaceForMarkAsArrived()
{
  $(document).unbind('keypress');
}

$(document).ready(function(){
  // Hover sur le bouton de sauvegarde ou de lancement
  $('.save-course, .launch-course, .save-resultat').hover(
    function() {
      $(this).addClass('ui-state-hover ui-state-active');
    },
    function() {
      $(this).removeClass('ui-state-hover ui-state-active');
    }
  );
  
  $('.validate-arrivee, .add-validate-arrivee').live({
    mouseenter: function() {
      $(this).addClass('ui-state-hover ui-state-active');
    },
    mouseleave: function() {
      $(this).removeClass('ui-state-hover ui-state-active');
    }
  });
  
  $('#validate-arrivee-close').live('click', function(){
    if (confirm('Cela va arrêter la course, le souhaitez-vous réellement ?')) {
      $('#course-launched').remove();
      $('#course-launched-bg').remove();
      desactivateSpaceForMarkAsArrived(); // Suppression de la gestion de l'espace
    }
  });
  
  $('#validate-arrivee-dossard').live('click', function(){
    clickOrSpaceForMarkAsArrived();
    return false;
  });
});