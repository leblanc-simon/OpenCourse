$(document).ready(function(){
  var id_launch_course;
  
  database.ready(function(){
    $('a[href="#launch-course"]').click(function(){
      // préparation de la liste déroulante pour les courses
      $('#select-launch-course').html('<option value=""></option>');
      database.getAll(['course'], function(data) {
        $('#select-launch-course').html($('#select-launch-course').html() + '<option value="' + data.DT_RowId + '">' + data.name + '</option>');
      });
      
      // On cache le bouton de lancement
      $('.launch-course').hide();
    });
    
    $('#select-launch-course').change(function(){
      // On affiche le bouton de sauvegarde
      $('.launch-course').show();
      
      // On récupère l'identifiant de la course
      id_launch_course = $(this).find('option:selected').val();
      
      if (id_launch_course == '') {
        $('.launch-course').hide();
      }
    });
    
    
    $('button.launch-course').click(function(){
      database.get(['course'], id_launch_course, function(course){
        if (launchCourse(course) == false) {
          return;
        }
        
        var html = $('#tmpl-launch-course').tmpl({ id_launch_course: id_launch_course });
        
        $('body').append(html);
        activateSpaceForMarkAsArrived(); // Ajout de la gestion de l'espace
      });
    });
  });
});