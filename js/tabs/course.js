$(document).ready(function(){
  // On affiche les tabulations
  $('#tabs').tabs();
  
  var courseTable = jTable({
    name: 'course',
    label: 'course',
    genre: 'feminin',
    fields: [
      {'label': 'Nom de la course', 'name': 'name'},
      {'label': 'Temps entre chaque participant (en seconde)', 'name': 'time'},
      {'label': 'Heure de départ (au format HH:MM)', 'name': 'start'},
      {'label': 'Longueur de la course (en mètre)', 'name': 'width'},
      {'label': 'Nombre de participant', 'name': 'nb_participants', 'type': 'readonly', 'default': '0'}
    ],
    data_insert: function(id, data) {
      return {
        DT_RowId        : id,
        name            : data.name,
        time            : data.time,
        start           : hourToMs(data.start),
        width           : data.width,
        nb_participants : data.nb_participants,
        participants    : [],
        resultats       : [],
      };
    },
    function_update: function(name, id, data) {
      database.get([name], id, function(course) {
        database.update([name], id,
                        {
                          DT_RowId        : id,
                          name            : data.name,
                          time            : data.time,
                          start           : hourToMs(data.start),
                          width           : data.width,
                          nb_participants : course.nb_participants,
                          participants    : course.participants,
                          resultats       : course.resultats
                        }
        );
      });
    },
    preprocess_load: function(datas) {
      for (i = 0; i < datas.length; i++) {
        datas[i].start = msToHour(datas[i].start, true);
      }
      return datas;
    },
    additionnal_buttons: [{'sExtends': "text", 'sButtonText': "Imprimer", 'fnClick': printPreparationCourse}]
  });
  
  if (courseTable.build() == false) {
    
  }
});