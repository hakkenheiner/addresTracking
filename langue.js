
const messages = {
    en: {
        bienvenue: "Welcome! Use the buttons below to add, remove or view the list of addresses to be monitored.",
        ajouter: "Please enter the address to be monitored, followed by the desired nickname, separated by a space. For example: 0x123... My address",
        supprimer: "Please enter the nickname of the address to be deleted.",
        listeAffiche: "----------------------\n\nHere is the list of addresses that you monitor :\n\n",
        listeError: "You are not currently monitoring any addresses.",
        adresseInvalide: "Invalid Ethereum address. Please try again.",
        adresseUtilise: "This address is already monitored. Please use another address.",
        pseudoVide: "The nickname cannot be empty. Please enter a nickname for the address.",
        pseudoUtilise: "This nickname is already in use for another address. Please use another username.",
        notifActive: "Notifications have been activated for the address ",
        notifActive2: " with the nickname ",
        supprimeError: "You are not currently monitoring any addresses.",
        pseudoError: "The nickname is not associated with any monitored address.",
        adresseSupprime: "The address ",
        adresseSupprime2: " has been removed from the list of monitored addresses."
    },
    fr: {
        bienvenue: "Bienvenue ! Utilisez les boutons ci-dessous pour ajouter, supprimer ou afficher la liste des adresses à surveiller.",
        ajouter: "Veuillez entrer l'adresse à surveiller, suivie du pseudo souhaité, séparés par un espace. Par exemple : 0x123... Mon adresse",
        supprimer: "Veuillez entrer le pseudo de l'adresse à supprimer.",
        listeAffiche: "----------------------\n\nVoici la liste des adresses que vous surveillez :\n\n",
        listeError: "Vous ne surveillez actuellement aucune adresse.",
        adresseInvalide: "Adresse Ethereum invalide. Veuillez réessayer.",
        adresseUtilise: "Cette adresse est déjà surveillée. Veuillez utiliser une autre adresse.",
        pseudoVide: "Le pseudo ne peut pas être vide. Veuillez entrer un pseudo pour l'adresse.",
        pseudoUtilise: "Ce pseudo est déjà utilisé pour une autre adresse. Veuillez utiliser un autre pseudo.",
        notifActive: "Les notifications ont été activées pour l'adresse ",
        notifActive2: " avec le pseudo ",
        supprimeError: "Vous ne surveillez actuellement aucune adresse.",
        pseudoError: "Le pseudo n'est associé à aucune adresse surveillée.",
        adresseSupprime: "L'adresse ",
        adresseSupprime2: " a été supprimée de la liste des adresses surveillées."
    }
  };

  
module.exports = {
    messages
}