import type { LegalContext, LegalDocs } from "./legal-types";

// Brouillons à faire relire par un avocat avant le lancement.
export function legalFr(c: LegalContext): LegalDocs {
  const L = c.legal;
  const P = c.providers;
  const company = `${L.companyName}, ${L.legalForm} au capital de ${L.capital}`;

  return {
    "mentions-legales": {
      title: "Mentions légales",
      sections: [
        {
          h: "Éditeur du site et de l’application",
          body: (
            <>
              <p>{company}, dont le siège est situé {L.address}, immatriculée au RCS de {L.rcs} sous le numéro {L.siren}. TVA intracommunautaire : {L.vat}.</p>
              <p>Responsable de la publication : {L.publicationDirector}.</p>
              <p>Contact : <a href={`mailto:${L.contactEmail}`}>{L.contactEmail}</a> · {L.phone}</p>
            </>
          ),
        },
        {
          h: "Hébergement et prestataires techniques",
          body: (
            <ul>
              <li>Hébergement du site : {P.host}</li>
              <li>Base de données : {P.database}</li>
              <li>Paiements : {P.payments}</li>
              <li>Envoi des e-mails : {P.emails}</li>
              <li>Nom de domaine et messagerie : {P.domain}</li>
            </ul>
          ),
        },
        {
          h: "Propriété intellectuelle",
          body: <p>La marque Boomly, le logo, les textes et le code du site sont la propriété de {L.companyName}. Toute reproduction sans autorisation est interdite. Les photos des commerces appartiennent aux commerçants partenaires qui les ont publiées.</p>,
        },
        {
          h: "Signaler un contenu ou un commerce",
          body: <p>Pour signaler un contenu illicite, un avis abusif ou un commerce problématique, écrivez à <a href={`mailto:${L.contactEmail}`}>{L.contactEmail}</a> en précisant le lien de la page concernée et la raison du signalement. Nous vous répondons dans les meilleurs délais.</p>,
        },
      ],
    },

    cgu: {
      title: "Conditions générales d’utilisation et de vente — voyageurs",
      sections: [
        {
          h: "1. Le service",
          body: (
            <>
              <p>Boomly est une plateforme qui permet de réserver et de payer en ligne la garde de bagages chez des commerçants partenaires (cafés, bars, tabacs, boutiques…). <strong>Boomly ne stocke aucun bagage</strong> : la garde est assurée par le commerçant choisi, professionnel indépendant vérifié par Boomly avant sa mise en ligne.</p>
              <p>Boomly agit comme intermédiaire : elle encaisse le paiement, en reverse une partie au commerçant et conserve une commission (voir « Comment fonctionne Boomly »).</p>
            </>
          ),
        },
        {
          h: "2. Réservation",
          body: <p>La réservation se fait sans création de compte : vous indiquez le point de dépôt, les horaires de dépôt et de retrait, le nombre et la taille des bagages, votre nom et votre adresse e-mail. Les horaires doivent être compris dans les heures d’ouverture du commerce, dans la limite de sa capacité. La réservation est confirmée par e-mail une fois le paiement validé ; cet e-mail contient votre code QR et un lien personnel pour gérer votre réservation.</p>,
        },
        {
          h: "3. Prix et paiement",
          body: (
            <>
              <p>Le prix est fixé par bagage et par tranche de 24 heures entamée, selon la taille : petit bagage {c.prices.small}, bagage moyen {c.prices.medium}, grand bagage {c.prices.large} par jour (prix TTC). Le montant total est affiché avant le paiement.</p>
              <p>Le paiement s’effectue en ligne par carte bancaire, Apple Pay ou Google Pay, via notre prestataire Stripe. Boomly n’a jamais accès à vos données bancaires.</p>
            </>
          ),
        },
        {
          h: "4. Dépôt et retrait",
          body: <p>Au dépôt, présentez votre code QR au commerçant. Il vérifie le nombre de bagages, les photographie et appose une étiquette numérotée sur chacun ; le dépôt est horodaté. Au retrait, le commerçant scanne à nouveau le code et vous rend vos bagages ; le code n’est alors plus utilisable. Le commerçant peut demander une pièce d’identité en cas de doute.</p>,
        },
        {
          h: "5. Retard au retrait",
          body: <p>Si vous ne récupérez pas vos bagages le jour prévu, ils restent sous la garde du commerçant jusqu’à sa réouverture. Chaque jour supplémentaire est facturé au même tarif par bagage, à régler sur place au moment du retrait, par paiement en ligne sécurisé.</p>,
        },
        {
          h: "6. Annulation, modification et rétractation",
          body: (
            <>
              <p>Vous pouvez <strong>annuler gratuitement et être remboursé intégralement jusqu’à l’heure de dépôt prévue</strong>, depuis le lien reçu par e-mail. Après cette heure, aucun remboursement n’est dû. Vous pouvez aussi modifier vos horaires avant l’heure de dépôt, si la durée facturée ne change pas et si de la place est disponible.</p>
              <p>Le service étant fourni à une date déterminée, le droit de rétractation de 14 jours ne s’applique pas (article L221-28 du Code de la consommation) ; l’annulation gratuite ci-dessus vous est offerte en remplacement.</p>
              <p>Si le commerce est fermé à votre arrivée, signalez-le depuis votre réservation : vous êtes remboursé intégralement.</p>
            </>
          ),
        },
        {
          h: "7. Objets interdits",
          body: (
            <>
              <p id="objets-interdits">Il est interdit de déposer : argent liquide, bijoux, objets de valeur et papiers d’identité ; produits dangereux, inflammables, explosifs ou illicites ; armes ; denrées périssables ; animaux. Le commerçant peut refuser un bagage suspect ou contenant un objet interdit, sans remboursement.</p>
            </>
          ),
        },
        {
          h: "8. Responsabilité et indemnisation",
          body: (
            <>
              <p>En cas de perte ou de dommage d’un bagage pendant la garde, signalez un incident depuis votre réservation dans un délai de {L.claimDelayDays} jours après le retrait, avec une description et des photos. Après examen (notamment des photos prises au dépôt), l’indemnisation est limitée à <strong>{L.indemnityCapPerBag} par bagage</strong>, sur justificatifs.</p>
              <p>Aucune indemnisation n’est due pour les objets interdits, l’usure normale, les dommages présents avant le dépôt ou les objets non déclarés.</p>
            </>
          ),
        },
        {
          h: "9. Avis",
          body: <p>Seuls les voyageurs ayant récupéré leurs bagages peuvent laisser un avis, une fois par réservation. Les avis sont publiés sans contrôle préalable ni contrepartie ; Boomly peut supprimer un avis injurieux, hors sujet ou illicite. Les avis ne sont pas modifiés.</p>,
        },
        {
          h: "10. Réclamations et médiation",
          body: <p>Pour toute réclamation : <a href={`mailto:${L.contactEmail}`}>{L.contactEmail}</a>. Si aucune solution n’est trouvée, vous pouvez recourir gratuitement au médiateur de la consommation : {L.mediatorName} ({L.mediatorUrl}). Vous pouvez aussi utiliser la plateforme européenne de règlement en ligne des litiges.</p>,
        },
        {
          h: "11. Droit applicable",
          body: <p>Les présentes conditions sont soumises au droit français. Version du {L.lastUpdated}.</p>,
        },
      ],
    },

    "conditions-partenaires": {
      title: "Conditions générales des commerçants partenaires",
      sections: [
        {
          h: "1. Objet",
          body: <p>Ces conditions encadrent la relation entre {L.companyName} (« Boomly ») et les professionnels qui gardent des bagages via la plateforme (« le Partenaire »).</p>,
        },
        {
          h: "2. Inscription et validation",
          body: <p>Le Partenaire s’inscrit avec des informations exactes : identité, coordonnées, nom et adresse du commerce, numéro SIRET, photos, horaires et capacité. Il crée un compte de paiement auprès de Stripe (vérification d’identité et coordonnées bancaires). Boomly vérifie chaque commerce avant sa mise en ligne et peut refuser une inscription.</p>,
        },
        {
          h: "3. Engagements du Partenaire",
          body: (
            <ul>
              <li>Garder les bagages dans un espace sûr, non accessible au public, pendant toute la durée prévue.</li>
              <li>Scanner le code QR au dépôt et au retrait, vérifier le nombre de bagages, les photographier et apposer une étiquette numérotée.</li>
              <li>Rendre les bagages uniquement sur présentation du code de la réservation.</li>
              <li>Tenir à jour ses horaires, fermetures exceptionnelles et sa capacité ; utiliser la pause en cas d’affluence.</li>
              <li>Refuser tout objet interdit et signaler sans délai tout incident.</li>
            </ul>
          ),
        },
        {
          h: "4. Rémunération et paiement",
          body: <p>Pour chaque réservation, le Partenaire perçoit <strong>{c.share} % du prix payé par le voyageur</strong> (ainsi que {c.share} % des suppléments de retard encaissés). Sa part est versée automatiquement par Stripe sur son compte après le retrait des bagages, puis sur son compte bancaire selon le calendrier de Stripe. Boomly conserve le solde au titre de sa commission et en adresse une facture récapitulative mensuelle au Partenaire. Le pourcentage peut évoluer ; le Partenaire en est informé au moins 30 jours à l’avance.</p>,
        },
        {
          h: "5. Annulations, incidents et remboursements",
          body: <p>Une réservation annulée avant le dépôt ne donne lieu à aucune rémunération. En cas d’incident imputable au Partenaire (bagage perdu, abîmé, commerce fermé sans prévenir), Boomly peut rembourser le voyageur et reprendre la part correspondante du Partenaire, après examen notamment des photos de dépôt.</p>,
        },
        {
          h: "6. Obligations fiscales (DAC7)",
          body: <p>Conformément à la réglementation européenne DAC7, Boomly déclare chaque année à l’administration fiscale les revenus perçus par les Partenaires via la plateforme, ainsi que leurs informations d’identification (identité, SIRET, coordonnées bancaires). Le Partenaire reste responsable de ses propres déclarations.</p>,
        },
        {
          h: "7. Suspension et fin du contrat",
          body: <p>Le Partenaire peut mettre son commerce en pause ou supprimer son compte à tout moment depuis son espace, une fois ses réservations en cours terminées. Boomly peut suspendre un commerce en cas de manquement, d’avis négatifs répétés ou d’incident grave.</p>,
        },
        {
          h: "8. Responsabilité et assurance",
          body: <p>Le Partenaire est responsable de la garde des bagages qui lui sont confiés. Il est invité à vérifier que son assurance professionnelle couvre cette activité.</p>,
        },
        {
          h: "9. Données et droit applicable",
          body: <p>Les données du Partenaire sont traitées selon la politique de confidentialité. Ces conditions sont soumises au droit français ; tout litige relève des tribunaux du siège de {L.companyName}. Version du {L.lastUpdated}.</p>,
        },
      ],
    },

    confidentialite: {
      title: "Politique de confidentialité",
      sections: [
        {
          h: "Responsable du traitement",
          body: <p>{company}, {L.address}. Contact pour vos données : <a href={`mailto:${L.privacyEmail}`}>{L.privacyEmail}</a>.</p>,
        },
        {
          h: "Données collectées",
          body: (
            <ul>
              <li><strong>Voyageurs</strong> : nom, adresse e-mail, téléphone (facultatif), détails de la réservation, photos des bagages prises au dépôt, signalements et avis. Aucun compte n’est créé.</li>
              <li><strong>Commerçants</strong> : identité, e-mail, téléphone, informations du commerce (adresse, SIRET, photos, horaires), historique des réservations et des versements.</li>
              <li><strong>Paiement</strong> : traité directement par Stripe ; Boomly ne reçoit jamais vos numéros de carte.</li>
              <li><strong>Technique</strong> : adresse IP et journaux de connexion (sécurité, prévention des abus).</li>
            </ul>
          ),
        },
        {
          h: "Pourquoi et sur quelle base",
          body: (
            <ul>
              <li>Gérer les réservations, la garde des bagages, les paiements et le service client : exécution du contrat.</li>
              <li>Facturation, comptabilité et déclaration DAC7 : obligation légale.</li>
              <li>Sécurité, prévention de la fraude et gestion des litiges (photos de dépôt) : intérêt légitime.</li>
              <li>E-mails liés à votre réservation (confirmation, demande d’avis) : exécution du contrat. Aucune prospection sans votre accord.</li>
            </ul>
          ),
        },
        {
          h: "Qui reçoit vos données",
          body: (
            <>
              <p>Le commerçant concerné par votre réservation (nom, horaires, nombre de bagages) et nos prestataires techniques, uniquement pour les besoins du service : {P.host} ; {P.database} ; {P.payments} ; {P.emails} ; {P.domain}.</p>
              <p>La carte affiche les fonds de plan d’OpenStreetMap et la recherche d’adresse utilise la Géoplateforme de l’IGN : votre navigateur leur transmet votre adresse IP lors de l’affichage. Certains prestataires sont situés aux États-Unis ; les transferts sont encadrés par les clauses contractuelles types de la Commission européenne ou le cadre de protection des données UE–États-Unis.</p>
              <p>Vos données ne sont jamais vendues.</p>
            </>
          ),
        },
        {
          h: "Durées de conservation",
          body: (
            <ul>
              <li>Réservations des voyageurs : {L.travelerDataYears} ans après la réservation, puis anonymisation automatique (les photos sont supprimées).</li>
              <li>Pièces comptables : 10 ans (obligation légale), sous forme anonymisée pour les voyageurs.</li>
              <li>Compte commerçant : pendant la relation, puis effacement des données personnelles à la suppression du compte ; les informations de facturation et DAC7 sont conservées pendant la durée légale.</li>
            </ul>
          ),
        },
        {
          h: "Vos droits",
          body: <p>Vous disposez d’un droit d’accès, de rectification, d’effacement, d’opposition, de limitation et de portabilité. Les commerçants peuvent télécharger leurs données et supprimer leur compte depuis « Mon compte ». Pour toute demande : <a href={`mailto:${L.privacyEmail}`}>{L.privacyEmail}</a>. Vous pouvez aussi saisir la CNIL (cnil.fr).</p>,
        },
        {
          h: "Sécurité et cookies",
          body: <p>Les données sont chiffrées en transit, l’accès est cloisonné par commerce et les photos de dépôt sont stockées dans un espace privé. Le site n’utilise que des cookies strictement nécessaires (voir la politique cookies). Version du {L.lastUpdated}.</p>,
        },
      ],
    },

    cookies: {
      title: "Politique cookies",
      sections: [
        {
          h: "Uniquement des cookies nécessaires",
          body: (
            <>
              <p>Boomly n’utilise <strong>aucun cookie de mesure d’audience, de publicité ou de réseau social</strong>. Seuls des cookies strictement nécessaires au fonctionnement sont déposés ; ils ne nécessitent pas votre consentement (article 82 de la loi Informatique et Libertés).</p>
              <ul>
                <li><strong>Session de connexion</strong> (espace commerçant) : garde le commerçant connecté.</li>
                <li><strong>Langue</strong> : retient le français ou l’anglais.</li>
                <li><strong>Paiement</strong> : sur la page de paiement, Stripe dépose ses propres cookies nécessaires à la sécurité du paiement et à la lutte contre la fraude.</li>
              </ul>
              <p>Si nous ajoutons un jour des outils de mesure d’audience, un bandeau vous permettra de les accepter ou de les refuser aussi simplement. Version du {L.lastUpdated}.</p>
            </>
          ),
        },
      ],
    },

    fonctionnement: {
      title: "Comment fonctionne Boomly",
      sections: [
        {
          h: "Qui sont les commerçants",
          body: <p>Les points de dépôt sont des commerçants professionnels indépendants (cafés, bars, tabacs, boutiques…) qui gardent les bagages et sont rémunérés pour cela. Chaque commerce est vérifié par Boomly avant sa mise en ligne (identité, SIRET, photos, adresse). Les garanties légales de conformité s’appliquent au service.</p>,
        },
        {
          h: "Classement des résultats",
          body: <p>Les points de dépôt sont classés <strong>uniquement par distance</strong> par rapport à l’adresse recherchée ou à votre position. Aucun commerçant ne paie pour être mieux placé. Seuls les commerces validés et non suspendus apparaissent ; les commerces fermés ou complets aux horaires choisis ne peuvent pas être réservés.</p>,
        },
        {
          h: "Formation du prix",
          body: <p>Les prix sont fixés par Boomly, identiques pour tous les commerces : petit bagage {c.prices.small}, bagage moyen {c.prices.medium}, grand bagage {c.prices.large}, par bagage et par tranche de 24 heures entamée. Sur chaque réservation, {c.share} % sont reversés au commerçant ; Boomly conserve le reste, qui couvre notamment les frais de paiement, le service client et le fonctionnement de la plateforme.</p>,
        },
        {
          h: "Avis",
          body: <p>Seuls les voyageurs ayant effectivement récupéré leurs bagages peuvent publier un avis. Les avis ne sont ni achetés ni filtrés selon leur note ; Boomly peut retirer un avis injurieux ou illicite.</p>,
        },
      ],
    },

    support: {
      title: "Aide et contact",
      sections: [
        {
          h: "Nous contacter",
          body: <p>Écrivez-nous à <a href={`mailto:${L.contactEmail}`}>{L.contactEmail}</a> en indiquant, si vous en avez une, votre référence de réservation (BMY-…). Nous répondons en général sous 24 heures ouvrées.</p>,
        },
        {
          h: "Vous avez réservé",
          body: (
            <ul>
              <li>Annuler, modifier ou signaler un problème : ouvrez le lien « Voir ma réservation » reçu par e-mail.</li>
              <li>Vous ne trouvez plus l’e-mail : vérifiez vos courriers indésirables, puis écrivez-nous avec l’adresse utilisée pour réserver.</li>
              <li>Questions fréquentes : consultez la FAQ en bas de la page d’accueil.</li>
            </ul>
          ),
        },
        {
          h: "Vous êtes commerçant partenaire",
          body: <p>Connectez-vous à votre espace partenaire pour gérer vos réservations, horaires et paiements. Mot de passe oublié : utilisez le lien sur la page de connexion. Pour supprimer votre compte ou télécharger vos données : « Mon compte ».</p>,
        },
        {
          h: "Signaler un abus",
          body: <p>Avis abusif, contenu illicite ou commerce problématique : écrivez à <a href={`mailto:${L.contactEmail}`}>{L.contactEmail}</a> avec le lien concerné.</p>,
        },
      ],
    },
  };
}
