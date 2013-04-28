/**
 * Génération d'un fichier de backup pour les catégories et les participants
 */
function generatebackup()
{
    var backup = {};
    database.getAllJSON(['categorie'], function(data) {
        backup.categories = data;
       
        database.getAllJSON(['participant'], function(data) {
            backup.participants = data;
            
            window.open("data:text/json;charset=utf-8," + escape(JSON.stringify(backup)));
        });
    });
}

/**
 * Importation d'un fichier de backup (nommé backup.json)
 */
function importBackup()
{
    $.ajax({
        type: 'GET',
        url: 'backup.json',
        dataType: 'json',
        success: function(data) {
            //insertion des catégories
            var nb_categories = data.categories.length;
            for (var i = 0; i < nb_categories; i++) {
                database.add(['categorie'], data.categories[i]);
            }
            
            //insertion des participants
            var nb_participants = data.participants.length;
            for (var i = 0; i < nb_participants; i++) {
                data.participants[i].license = '';
                database.add(['participant'], data.participants[i]);
            }
        }
    });
}