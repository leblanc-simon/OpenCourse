$(document).ready(function(){
  var categorieTable = jTable({
    name: 'categorie',
    label: 'catégorie',
    genre: 'feminin',
    fields: [
      {'label': 'Nom de la catégorie', 'name': 'name'},
      {'label': 'Sexe', 'name': 'sex', 'type': 'radio', 'ipOpts':
        [
         {value: 'Masculin', label: 'Masculin'},
         {value: 'Féminin', label: 'Féminin'},
        ]
      },
      {'label': 'Âge minimum', 'name': 'min'},
      {'label': 'Âge maximum', 'name': 'max'}
    ],
    data_insert: function(id, data) {
      return {
        DT_RowId: id,
        name:     data.name,
        sex:      data.sex,
        min:      data.min,
        max:      data.max
      };
    },
    data_update: function(id, data) {
      return {
        DT_RowId: id,
        name:     data.name,
        sex:      data.sex,
        min:      data.min,
        max:      data.max
      };
    }
  });
  
  if (categorieTable.build() == false) {
    
  }
});