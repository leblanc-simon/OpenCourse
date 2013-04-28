
$(document).ready(function(){
  // On affiche les tabulations
  $('#tabs').tabs();
  
  database.ready(function() {
    database.getAllJSON(['categorie'], function(datas){
      cat_datas = [];
      for (var i= 0; i < datas.length; i++) {
        cat_datas.push({ label : datas[i].name, value : datas[i].name })
      }
      
      var participantTable = jTable({
        name: 'participant',
        label: 'participant',
        genre: 'masculin',
        fields: [
          {'label': 'Nom', 'name': 'lastname'},
          {'label': 'Prénom', 'name': 'firstname'},
          {'label': 'N° de licence', 'name': 'license'},
          {'label': 'Club', 'name': 'club'},
          {'label': 'Catégorie', 'name': 'categorie', 'type': 'select', 'ipOpts': cat_datas}
        ],
        data_insert: function(id, data) {
          return {
            DT_RowId  : id,
            lastname  : data.lastname,
            firstname : data.firstname,
            license   : data.license,
            club      : data.club,
            categorie : data.categorie
          };
        },
        data_update: function(id, data) {
          return {
            DT_RowId  : id,
            lastname  : data.lastname,
            firstname : data.firstname,
            license   : data.license,
            club      : data.club,
            categorie : data.categorie
          };
        }
      });
      
      if (participantTable.build() == false) {
        
      }
    });
  });
});