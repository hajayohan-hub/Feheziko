/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseEngine } from "../core/DatabaseEngine";
import { AudioEngine } from "../core/AudioEngine";

export class FzDelfExam extends HTMLElement {
  private db!: DatabaseEngine;
  private audio!: AudioEngine;
  private activeTab: "exam" | "alliances" | "guide" = "exam";
  
  // Exam State
  private currentSection: number = 0; // 0: Oral Comp, 1: Written Comp, 2: Written Prod, 3: Oral Prod
  private examStarted: boolean = false;
  private examSubmitted: boolean = false;
  private timerSeconds: number = 80 * 60; // 1h 20m standard DELF A1 duration
  private timerInterval: any = null;

  // Answers State
  private oralCompAnswers: Record<string, string> = {};
  private writtenCompAnswers: Record<string, string> = {};
  private writtenProdForm: Record<string, string> = {};
  private writtenProdText: string = "";
  private oralProdSelfPresentation: string = "";
  private oralProdQuestionResponses: Record<string, string> = {};
  
  // Audio state
  private isPlayingAudio: boolean = false;
  private activeAudioId: string | null = null;
  private isRecordingOral: boolean = false;
  private oralRecordResults: Record<string, any> = {};

  // Selected Region Filter for Alliances
  private selectedRegionFilter: string = "ALL";
  private allianceSearchQuery: string = "";

  // Selected Level State
  private selectedLevel: "A1" | "A2" = "A1";

  private get examData() {
    return this.selectedLevel === "A1" ? this.examDataA1 : this.examDataA2;
  }

  // Official DELF A1 Mock Exam Dataset
  private examDataA1 = {
    title: "DELF A1 - Examen Blanc Officiel (CECRL)",
    totalPoints: 100,
    passingScore: 50,
    minSectionScore: 5,
    sections: [
      {
        id: "oral_comp",
        title: "Épreuve 1 : Compréhension de l'oral",
        time: "20 minutes",
        points: 25,
        icon: "🎧",
        instructionsFr: "Vous allez entendre 4 enregistrements. Pour chaque document, vous aurez 30 secondes pour lire les questions, puis une première écoute, 30 secondes de pause, une deuxième écoute et 30 secondes de pause.",
        instructionsMg: "Henoinao ireto feo 4 ireto. Isaky ny raki-peo dia manana 30 segondra ianao hamakiana ny fanontaniana, avy eo mihaino voalohany, fiatoana 30s, mihaino faharoa ary fiatoana 30s.",
        exercises: [
          {
            id: "oc_ex1",
            title: "Exercice 1 : Annonce publique à la gare",
            points: 6,
            audioText: "Chers voyageurs, le train numéro 4521 à destination de Lyon Part-Dieu va partir voie B à 14 heures 15. Veuillez composter votre billet avant de monter à bord.",
            questions: [
              {
                id: "q1",
                text: "Où êtes-vous ?",
                type: "mcq",
                options: ["À l'aéroport", "À la gare", "Dans un bus"],
                correctAnswer: "À la gare",
                points: 2
              },
              {
                id: "q2",
                text: "Quelle est la destination du train ?",
                type: "mcq",
                options: ["Paris", "Marseille", "Lyon Part-Dieu"],
                correctAnswer: "Lyon Part-Dieu",
                points: 2
              },
              {
                id: "q3",
                text: "À quelle heure part le train ?",
                type: "mcq",
                options: ["14h15", "14h50", "15h14"],
                correctAnswer: "14h15",
                points: 2
              }
            ]
          },
          {
            id: "oc_ex2",
            title: "Exercice 2 : Message téléphonique",
            points: 6,
            audioText: "Bonjour Thomas, c'est Sophie. Je t'appelle pour notre rendez-vous au restaurant demain midi. Est-ce qu'on peut se retrouver à 12h30 devant le café de la Paix ? Rappelle-moi au 06 12 34 56 78. À demain !",
            questions: [
              {
                id: "q4",
                text: "Qui a laissé ce message ?",
                type: "mcq",
                options: ["Marie", "Sophie", "Julie"],
                correctAnswer: "Sophie",
                points: 2
              },
              {
                id: "q5",
                text: "Où veulent-ils se retrouver ?",
                type: "mcq",
                options: ["Au cinéma", "Devant le café de la Paix", "À la boulangerie"],
                correctAnswer: "Devant le café de la Paix",
                points: 2
              },
              {
                id: "q6",
                text: "À quelle heure est le rendez-vous ?",
                type: "mcq",
                options: ["12h00", "12h30", "13h00"],
                correctAnswer: "12h30",
                points: 2
              }
            ]
          },
          {
            id: "oc_ex3",
            title: "Exercice 3 : Dialogue dans un magasin",
            points: 6,
            audioText: "– Bonjour Monsieur, je voudrais deux kilos de pommes et une baguette de pain, s'il vous plaît.\n– Oui, voilà Madame. Cela fera 4 euros et 50 centimes au total.\n– Voici un billet de 10 euros.\n– Merci, voici votre monnaie : 5 euros et 50 centimes. Bonne journée !",
            questions: [
              {
                id: "q7",
                text: "Que veut acheter la cliente ?",
                type: "mcq",
                options: ["Des pommes et du pain", "Des oranges et du fromage", "Du lait et des tomates"],
                correctAnswer: "Des pommes et du pain",
                points: 2
              },
              {
                id: "q8",
                text: "Combien coûte la commande ?",
                type: "mcq",
                options: ["3,50 €", "4,50 €", "5,50 €"],
                correctAnswer: "4,50 €",
                points: 2
              },
              {
                id: "q9",
                text: "Combien le vendeur rend-il de monnaie ?",
                type: "mcq",
                options: ["4,50 €", "5,50 €", "10,00 €"],
                correctAnswer: "5,50 €",
                points: 2
              }
            ]
          },
          {
            id: "oc_ex4",
            title: "Exercice 4 : Invitation à un anniversaire",
            points: 7,
            audioText: "Salut Luc ! C'est Nicolas. Je fête mon anniversaire samedi soir à partir de 20 heures chez moi. Tu peux venir avec des amis. N'oublie pas d'apporter un gâteau ou des boissons. Réponds-moi vite par SMS !",
            questions: [
              {
                id: "q10",
                text: "Quel événement fêle Nicolas ?",
                type: "mcq",
                options: ["Son mariage", "Son anniversaire", "Une réussite d'examen"],
                correctAnswer: "Son anniversaire",
                points: 2
              },
              {
                id: "q11",
                text: "Quel jour a lieu la fête ?",
                type: "mcq",
                options: ["Vendredi soir", "Samedi soir", "Dimanche midi"],
                correctAnswer: "Samedi soir",
                points: 2
              },
              {
                id: "q12",
                text: "Comment Luc doit-il répondre ?",
                type: "mcq",
                options: ["Par e-mail", "Par téléphone", "Par SMS"],
                correctAnswer: "Par SMS",
                points: 3
              }
            ]
          }
        ]
      },
      {
        id: "written_comp",
        title: "Épreuve 2 : Compréhension des écrits",
        time: "30 minutes",
        points: 25,
        icon: "📖",
        instructionsFr: "Lisez attentivement les documents suivants et répondez aux questions en cochant la bonne réponse.",
        instructionsMg: "Vakio tsara ireto tahirin-kevitra ireto ary valio ny fanontaniana amin'ny alalan'ny fisafidianana ny valiny marina.",
        exercises: [
          {
            id: "wc_ex1",
            title: "Document 1 : Courriel d'invitation",
            points: 6,
            documentText: `De: paul.dubois@email.fr
À: antoine.martin@email.fr
Objet: Dîner à la maison vendredi !

Salut Antoine,
J'espère que tu vas bien. Est-ce que tu es libre ce vendredi 12 mai ?
Je prépare un repas spécial chez moi à partir de 19h30 pour fêter mon nouvel appartement.
Mon adresse : 15, rue de la République, près de la station de métro Bastille.
Préviens-moi si tu viens avant mercredi !
Amicalement,
Paul`,
            questions: [
              {
                id: "wq1",
                text: "Pourquoi Paul écrit-il ce courriel ?",
                type: "mcq",
                options: ["Pour réserver une table", "Pour inviter Antoine à dîner", "Pour vendre son appartement"],
                correctAnswer: "Pour inviter Antoine à dîner",
                points: 2
              },
              {
                id: "wq2",
                text: "Quel est le jour du dîner ?",
                type: "mcq",
                options: ["Mercredi", "Vendredi 12 mai", "Samedi"],
                correctAnswer: "Vendredi 12 mai",
                points: 2
              },
              {
                id: "wq3",
                text: "À quelle heure commence le repas ?",
                type: "mcq",
                options: ["18h00", "19h30", "20h30"],
                correctAnswer: "19h30",
                points: 2
              }
            ]
          },
          {
            id: "wc_ex2",
            title: "Document 2 : Affiche de magasin",
            points: 6,
            documentText: `------------------------------------------------
         BOULANGERIE - PÂTISSERIE SOLEIL
------------------------------------------------
📍 24 Rue des Fleurs, Antananarivo
⏰ Ouvert du mardi au dimanche de 06h30 à 19h00.
⛔ Fermé le lundi.

⚡ PROMOTION SPÉCIALE CE MOIS-CI :
Pour l'achat de 3 croissants, le 4ème croissant est GRATUIT !
Acceptons paiements en liquide et Mobile Money (Mvola / Airtel Money).`,
            questions: [
              {
                id: "wq4",
                text: "Quel jour le magasin est-il fermé ?",
                type: "mcq",
                options: ["Le dimanche", "Le samedi", "Le lundi"],
                correctAnswer: "Le lundi",
                points: 2
              },
              {
                id: "wq5",
                text: "Quelle est la promotion du mois ?",
                type: "mcq",
                options: ["Un café gratuit le matin", "Le 4ème croissant gratuit pour 3 achetés", "50% de réduction sur tout"],
                correctAnswer: "Le 4ème croissant gratuit pour 3 achetés",
                points: 2
              },
              {
                id: "wq6",
                text: "À quelle heure ferme la boulangerie le soir ?",
                type: "mcq",
                options: ["18h00", "19h00", "20h00"],
                correctAnswer: "19h00",
                points: 2
              }
            ]
          },
          {
            id: "wc_ex3",
            title: "Document 3 : Emploi du temps des cours",
            points: 6,
            documentText: `------------------------------------------------
     ALLIANCE FRANÇAISE - COURS DE FRANÇAIS A1
------------------------------------------------
Salle 102 - Session de Juin
• Lundi & Mercredi (14h00 - 16h00) : Grammaire & Vocabulaire
• Mardi & Jeudi (09h00 - 11h00) : Expression orale & Écoute
• Samedi (08h30 - 11h30) : Atelier de préparation au DELF A1

Important : Présentez votre carte d'étudiant à l'entrée.`,
            questions: [
              {
                id: "wq7",
                text: "Quel jour a lieu l'atelier de préparation au DELF A1 ?",
                type: "mcq",
                options: ["Mardi", "Jeudi", "Samedi"],
                correctAnswer: "Samedi",
                points: 2
              },
              {
                id: "wq8",
                text: "Quels jours travaillent-ils la grammaire et le vocabulaire ?",
                type: "mcq",
                options: ["Lundi & Mercredi", "Mardi & Jeudi", "Vendredi & Samedi"],
                correctAnswer: "Lundi & Mercredi",
                points: 2
              },
              {
                id: "wq9",
                text: "Que faut-il présenter à l'entrée ?",
                type: "mcq",
                options: ["Un passeport français", "La carte d'étudiant", "Le diplôme du DELF"],
                correctAnswer: "La carte d'étudiant",
                points: 2
              }
            ]
          },
          {
            id: "wc_ex4",
            title: "Document 4 : Carte postale de vacances",
            points: 7,
            documentText: `Cher David,

Je suis en vacances à Nosy Be depuis trois jours. Le temps est magnifique et il fait très chaud (30°C). 
Chaque matin, je me baigne dans la mer et l'après-midi, je visite l'île à vélo. 
La nourriture est excellente, surtout les poissons frais. 
Je rentre à Antananarivo dimanche prochain.
À très bientôt !
Haja`,
            questions: [
              {
                id: "wq10",
                text: "Où Haja passe-t-il ses vacances ?",
                type: "mcq",
                options: ["À Antsirabe", "À Nosy Be", "À Tamatave"],
                correctAnswer: "À Nosy Be",
                points: 2
              },
              {
                id: "wq11",
                text: "Que fait-il l'après-midi ?",
                type: "mcq",
                options: ["Il se baigne", "Il visite l'île à vélo", "Il dort à l'hôtel"],
                correctAnswer: "Il visite l'île à vélo",
                points: 2
              },
              {
                id: "wq12",
                text: "Quand rentre-t-il à Antananarivo ?",
                type: "mcq",
                options: ["Vendredi prochain", "Samedi prochain", "Dimanche prochain"],
                correctAnswer: "Dimanche prochain",
                points: 3
              }
            ]
          }
        ]
      },
      {
        id: "written_prod",
        title: "Épreuve 3 : Production écrite",
        time: "15 minutes",
        points: 25,
        icon: "✍️",
        instructionsFr: "Cette épreuve comporte deux parties : 1) Remplir un formulaire de fiche de renseignements (10 pts) et 2) Rédiger un court message ou carte postale de 40 à 50 mots (15 pts).",
        instructionsMg: "Ahitana fizarana roa ity fanadinana ity: 1) Famenoana taratasy fampahafantarana (10 pts) ary 2) Fanoratana hafatra fohy na karatra (40 ka hatramin'ny 50 teny) (15 pts).",
        exercises: [
          {
            id: "wp_part1",
            title: "Partie 1 : Remplir une fiche de renseignements (10 points)",
            description: "Vous vous inscrivez à un cours de langue à l'Alliance Française. Complétez la fiche avec vos informations personnelles.",
            fields: [
              { key: "nom", label: "Nom de famille", placeholder: "ex: RAKOTO", points: 2 },
              { key: "prenom", label: "Prénom", placeholder: "ex: Jean", points: 2 },
              { key: "dateNaissance", label: "Date de naissance", placeholder: "ex: 15/04/1998", points: 2 },
              { key: "nationalite", label: "Nationalité", placeholder: "ex: Malagasy", points: 2 },
              { key: "adresseTel", label: "Adresse & Téléphone", placeholder: "ex: Lot IB 12 Antananarivo, 034 02 123 45", points: 2 }
            ]
          },
          {
            id: "wp_part2",
            title: "Partie 2 : Rédiger un court message / Carte postale (15 points)",
            description: "Écrivez un message à un ami français (40 à 50 mots) pour l'inviter à venir visiter Madagascar pendant les vacances. Indiquez le lieu, ce qu'on peut faire et la période idéale.",
            minWords: 35,
            maxWords: 65,
            sampleAnswer: "Cher Thomas, Comment vas-tu ? Je t'invite à venir visiter Madagascar en novembre. Nous pourrons visiter les belles plages de Nosy Be et goûter les plats traditionnels. Il fait très beau et chaud. Dis-moi si tu peux venir ! Amicalement, Haja."
          }
        ]
      },
      {
        id: "oral_prod",
        title: "Épreuve 4 : Production orale",
        time: "10 minutes (3 parties)",
        points: 25,
        icon: "🗣️",
        instructionsFr: "L'épreuve orale se déroule en 3 parties guidées : 1) Entretien dirigé (se présenter) (8 pts), 2) Échange d'informations (poser des questions à partir de mots) (8 pts), 3) Jeu de rôle (situation de la vie quotidienne) (9 pts).",
        instructionsMg: "Mizara 3 ny fanadinana am-bava: 1) Fampahafantarana ny tena (8 pts), 2) Famafana fanontaniana avy amin'ny teny (8 pts), 3) Lalao anjara amin'ny fiainana andavanandro (9 pts).",
        parts: [
          {
            id: "op_part1",
            title: "Partie 1 : Entretien dirigé (Présentation personnelle - 8 pts)",
            instructions: "Répondez aux questions de l'examinateur pour vous présenter en français (Nom, âge, nationalité, profession, famille, goûts).",
            prompts: [
              { id: "op1", question: "Comment vous vous appelez ?", expectedKeywords: ["m'appelle", "suis", "nom"] },
              { id: "op2", question: "Quelle est votre nationalité et où habitez-vous ?", expectedKeywords: ["malgache", "habite", "antananarivo", "madagascar"] },
              { id: "op3", question: "Parlez-moi de votre famille ou de vos loisirs.", expectedKeywords: ["famille", "aime", "musique", "sport", "lire"] }
            ]
          },
          {
            id: "op_part2",
            title: "Partie 2 : Échange d'informations (Poser des questions - 8 pts)",
            instructions: "À partir des mots clés suivants, formulez une question correcte en français comme lors du vrai DELF A1.",
            cards: [
              { word: "HEURE", example: "Quelle heure est-il, s'il vous plaît ?" },
              { word: "PRIX", example: "Combien coûte ce livre ?" },
              { word: "SPORT", example: "Faites-vous du sport le week-end ?" },
              { word: "TRAIN / BUS", example: "Où se trouve la station de bus ?" }
            ]
          },
          {
            id: "op_part3",
            title: "Partie 3 : Jeu de rôle - Au marché / À la boulangerie (9 pts)",
            instructions: "Vous êtes au marché à Antananarivo et vous voulez acheter des fruits. Saluez le vendeur, demandez le prix, achetez 1 kg de bananes et payez.",
            scenario: "Vendeur : 'Bonjour Monsieur/Madame, que désirez-vous aujourd'hui ?'\nVous : (Acheter des fruits, demander le prix et payer)."
          }
        ]
      }
    ]
  };

  // Official DELF A2 Mock Exam Dataset
  private examDataA2 = {
    title: "DELF A2 - Examen Blanc Officiel (CECRL)",
    totalPoints: 100,
    passingScore: 50,
    minSectionScore: 5,
    sections: [
      {
        id: "oral_comp",
        title: "Épreuve 1 : Compréhension de l'oral",
        time: "25 minutes",
        points: 25,
        icon: "🎧",
        instructionsFr: "Vous allez entendre 4 enregistrements courts portant sur des situations de la vie quotidienne. Vous aurez 30 secondes pour lire les questions, deux écoutes séparées par 30 secondes de pause, puis 30 secondes pour vérifier vos réponses.",
        instructionsMg: "Henoinao ireto feo 4 ireto amin'ny fiainana andavanandro. Manana 30s ianao hamakiana fanontaniana, fihainoana in-2 misy fiatoana 30s.",
        exercises: [
          {
            id: "oc_a2_ex1",
            title: "Exercice 1 : Annonce dans un centre commercial",
            points: 6,
            audioText: "Chers clients, votre supermarché Leader Price ferme ses portes dans 15 minutes à 19h45. Nous vous prions de vous diriger vers les caisses. Profitez également de notre offre sur les produits locaux à -20%. Merci de votre visite.",
            questions: [
              {
                id: "a2_q1",
                text: "À quelle heure ferme le supermarché ?",
                type: "mcq",
                options: ["19h30", "19h45", "20h00"],
                correctAnswer: "19h45",
                points: 2
              },
              {
                id: "a2_q2",
                text: "Où les clients doivent-ils se rendre ?",
                type: "mcq",
                options: ["À l'accueil", "Vers les caisses", "Au rayon fruits"],
                correctAnswer: "Vers les caisses",
                points: 2
              },
              {
                id: "a2_q3",
                text: "Quelle est la réduction offerte sur les produits locaux ?",
                type: "mcq",
                options: ["-10%", "-20%", "-30%"],
                correctAnswer: "-20%",
                points: 2
              }
            ]
          },
          {
            id: "oc_a2_ex2",
            title: "Exercice 2 : Message vocal de réservation d'hôtel",
            points: 6,
            audioText: "Bonjour, c'est l'Hôtel Le Vacoa à Tamatave. Nous confirmons votre réservation pour une chambre double du vendredi 14 au dimanche 16. Le petit-déjeuner est inclus et servi de 7h à 10h. Veuillez nous rappeler pour confirmer l'heure de votre arrivée.",
            questions: [
              {
                id: "a2_q4",
                text: "Quel est l'établissement qui appelle ?",
                type: "mcq",
                options: ["L'Hôtel Le Vacoa", "Une agence de voyage", "Un restaurant"],
                correctAnswer: "L'Hôtel Le Vacoa",
                points: 2
              },
              {
                id: "a2_q5",
                text: "Combien de nuits dure la réservation ?",
                type: "mcq",
                options: ["1 nuit", "2 nuits", "3 nuits"],
                correctAnswer: "2 nuits",
                points: 2
              },
              {
                id: "a2_q6",
                text: "Quels sont les horaires du petit-déjeuner ?",
                type: "mcq",
                options: ["6h à 9h", "7h à 10h", "8h à 11h"],
                correctAnswer: "7h à 10h",
                points: 2
              }
            ]
          },
          {
            id: "oc_a2_ex3",
            title: "Exercice 3 : Dialogue sur une recherche d'emploi",
            points: 6,
            audioText: "– Allô, je téléphone pour l'annonce de serveur au café du Port.\n– Oui, le poste est à pourvoir immédiatement pour les week-ends de 18h à 23h.\n– Est-ce qu'une expérience est exigée ?\n– Oui, au moins 6 mois dans la restauration. Envoyez-nous votre CV par e-mail.",
            questions: [
              {
                id: "a2_q7",
                text: "Pour quel poste la personne téléphone-t-elle ?",
                type: "mcq",
                options: ["Cuisinier", "Serveur", "Réceptionniste"],
                correctAnswer: "Serveur",
                points: 2
              },
              {
                id: "a2_q8",
                text: "Quels sont les jours de travail ?",
                type: "mcq",
                options: ["Du lundi au vendredi", "Les week-ends", "Tous les soirs"],
                correctAnswer: "Les week-ends",
                points: 2
              },
              {
                id: "a2_q9",
                text: "Quelle expérience est demandée ?",
                type: "mcq",
                options: ["Aucune expérience", "Au moins 6 mois", "Plus de 2 ans"],
                correctAnswer: "Au moins 6 mois",
                points: 2
              }
            ]
          },
          {
            id: "oc_a2_ex4",
            title: "Exercice 4 : Émission radio - Météo et circulation",
            points: 7,
            audioText: "Bonjour à tous sur Radio Madagascar. Aujourd'hui, prévoyez de fortes pluies sur la côte Est et du soleil à Antananarivo avec 24 degrés. Attention aux ralentissements sur la RN7 en raison de travaux entre Ambatolampy et Antsirabe.",
            questions: [
              {
                id: "a2_q10",
                text: "Quel temps fait-il sur la côte Est ?",
                type: "mcq",
                options: ["Du grand soleil", "De fortes pluies", "Du vent fort"],
                correctAnswer: "De fortes pluies",
                points: 2
              },
              {
                id: "a2_q11",
                text: "Quelle est la température annoncée à Antananarivo ?",
                type: "mcq",
                options: ["18°C", "24°C", "30°C"],
                correctAnswer: "24°C",
                points: 2
              },
              {
                id: "a2_q12",
                text: "Pourquoi y a-t-il des ralentissements sur la RN7 ?",
                type: "mcq",
                options: ["Un accident", "Des travaux", "Un défilé"],
                correctAnswer: "Des travaux",
                points: 3
              }
            ]
          }
        ]
      },
      {
        id: "written_comp",
        title: "Épreuve 2 : Compréhension des écrits",
        time: "30 minutes",
        points: 25,
        icon: "📖",
        instructionsFr: "Lisez les documents d'information de la vie quotidienne et répondez aux questions.",
        instructionsMg: "Vakio ny tahirin-kevitra amin'ny fiainana andavanandro ary valio ny fanontaniana.",
        exercises: [
          {
            id: "wc_a2_ex1",
            title: "Document 1 : Offre d'emploi assistant commercial",
            points: 6,
            documentText: `OFFRE D'EMPLOI : ASSISTANT COMMERCIAL
Entreprise de textile à Antananarivo recherche un assistant commercial.
Missions : Accueil de la clientèle, gestion des e-mails, rédaction des devis.
Profil : Diplôme de niveau Bac minimum, maîtrise du français parlé et écrit, ponctuel et dynamique.
Lieu : Ankorondrano, Antananarivo. Rémunération : Selon profil + primes.
Pour postuler : Envoyez CV et lettre de motivation à recrutement@textile.mg avant le 30 juin.`,
            questions: [
              {
                id: "a2_wq1",
                text: "Dans quel secteur l'entreprise travaille-t-elle ?",
                type: "mcq",
                options: ["Informatique", "Textile", "Restauration"],
                correctAnswer: "Textile",
                points: 2
              },
              {
                id: "a2_wq2",
                text: "Quel est le diplôme minimum exigé ?",
                type: "mcq",
                options: ["BEPC", "Baccalauréat", "Master"],
                correctAnswer: "Baccalauréat",
                points: 2
              },
              {
                id: "a2_wq3",
                text: "Avant quelle date faut-il envoyer sa candidature ?",
                type: "mcq",
                options: ["15 juin", "30 juin", "15 juillet"],
                correctAnswer: "30 juin",
                points: 2
              }
            ]
          },
          {
            id: "wc_a2_ex2",
            title: "Document 2 : Règlement de la bibliothèque municipale",
            points: 6,
            documentText: `RÈGLEMENT INTÉRIEUR - BIBLIOTHÈQUE MUNICIPALE
• L'emprunt est limité à 4 livres pour une durée maximale de 3 semaines.
• Tout retard entraînera une amende de 1000 Ariary par jour de retard.
• Il est strictement interdit de téléphoner, de manger ou de boire dans la salle de lecture.
• La carte de lecteur est personnelle et doit être renouvelée chaque année.`,
            questions: [
              {
                id: "a2_wq4",
                text: "Combien de livres peut-on emprunter au maximum ?",
                type: "mcq",
                options: ["2 livres", "4 livres", "6 livres"],
                correctAnswer: "4 livres",
                points: 2
              },
              {
                id: "a2_wq5",
                text: "Pendant combien de temps peut-on garder les livres ?",
                type: "mcq",
                options: ["2 semaines", "3 semaines", "1 mois"],
                correctAnswer: "3 semaines",
                points: 2
              },
              {
                id: "a2_wq6",
                text: "Qu'est-ce qui est interdit dans la salle de lecture ?",
                type: "mcq",
                options: ["Prendre des notes", "Téléphoner et manger", "Utiliser un ordinateur portable"],
                correctAnswer: "Téléphoner et manger",
                points: 2
              }
            ]
          },
          {
            id: "wc_a2_ex3",
            title: "Document 3 : E-mail de demande d'informations",
            points: 6,
            documentText: `De: mireille@email.mg
À: contact@alliancefr.mg
Objet: Demande d'information cours du soir DELF A2

Bonjour,
Je souhaite m'inscrire aux cours du soir de préparation au DELF A2 pour le mois prochain.
Pouvez-vous me communiquer les horaires disponibles ainsi que les tarifs ?
Est-il possible d'effectuer un test de niveau avant l'inscription ?
Je vous remercie par avance.
Mireille R.`,
            questions: [
              {
                id: "a2_wq7",
                text: "Pour quel diplôme Mireille cherche-t-elle des cours ?",
                type: "mcq",
                options: ["DELF A1", "DELF A2", "DELF B1"],
                correctAnswer: "DELF A2",
                points: 2
              },
              {
                id: "a2_wq8",
                text: "Quelles informations demande-t-elle dans son courriel ?",
                type: "mcq",
                options: ["Les horaires et tarifs", "L'adresse du centre", "Le nom des professeurs"],
                correctAnswer: "Les horaires et tarifs",
                points: 2
              },
              {
                id: "a2_wq9",
                text: "Que demande-t-elle à propos du test de niveau ?",
                type: "mcq",
                options: ["S'il est gratuit", "S'il peut se faire avant l'inscription", "S'il dure 2 heures"],
                correctAnswer: "S'il peut se faire avant l'inscription",
                points: 2
              }
            ]
          },
          {
            id: "wc_a2_ex4",
            title: "Document 4 : Article de journal - Festival de musique",
            points: 7,
            documentText: `FESTIVAL DE LA MUSIQUE À ANTSIRABE
Le grand festival annuel de musique aura lieu du 18 au 20 août au Jardin Poincaré.
Plus de 20 artistes locaux et internationaux se produiront sur scène.
Entrée gratuite pour les enfants de moins de 12 ans. Billets disponibles à l'Alliance Française et en ligne.
Des stands de nourriture et de boissons locales seront installés sur place.`,
            questions: [
              {
                id: "a2_wq10",
                text: "Où se déroule le festival de musique ?",
                type: "mcq",
                options: ["Au Jardin Poincaré à Antsirabe", "Au stade de Mahajanga", "À l'université d'Antananarivo"],
                correctAnswer: "Au Jardin Poincaré à Antsirabe",
                points: 2
              },
              {
                id: "a2_wq11",
                text: "Pour qui l'entrée est-elle gratuite ?",
                type: "mcq",
                options: ["Pour les étudiants", "Pour les enfants de moins de 12 ans", "Pour tout le monde"],
                correctAnswer: "Pour les enfants de moins de 12 ans",
                points: 2
              },
              {
                id: "a2_wq12",
                text: "Où peut-on acheter les billets ?",
                type: "mcq",
                options: ["Uniquement à la banque", "À l'Alliance Française et en ligne", "À la mairie"],
                correctAnswer: "À l'Alliance Française et en ligne",
                points: 3
              }
            ]
          }
        ]
      },
      {
        id: "written_prod",
        title: "Épreuve 3 : Production écrite",
        time: "45 minutes",
        points: 25,
        icon: "✍️",
        instructionsFr: "Cette épreuve comporte 2 tâches : 1) Rédiger un message bref décrivant un événement passé (10 pts) et 2) Écrire un courriel pour inviter, remercier ou s'excuser (15 pts, 60 à 80 mots).",
        instructionsMg: "Mizara 2 ity épreuve ity: 1) Fanoratana hafatra momba ny zavatra nitranga (10 pts) ary 2) Fanoratana e-mail ho an'ny mpanasa / mpisaotra (15 pts, 60 hatramin'ny 80 teny).",
        exercises: [
          {
            id: "wp_a2_part1",
            title: "Tâche 1 : Raconter un événement passé ou une expérience (10 points)",
            description: "Vous avez participé à un événement le week-end dernier (fête, voyage, activité). Remplissez ces informations clés.",
            fields: [
              { key: "nom", label: "Nom & Prénom", placeholder: "ex: RAKOTO Jean", points: 2 },
              { key: "evenement", label: "Événement ou activité", placeholder: "ex: Mariage / Excursion à Mantasoa", points: 2 },
              { key: "lieuDate", label: "Lieu & Date", placeholder: "ex: Antananarivo, samedi dernier", points: 2 },
              { key: "activites", label: "Activités réalisées", placeholder: "ex: Danser, visiter le parc, prendre des photos", points: 2 },
              { key: "impression", label: "Votre impression", placeholder: "ex: C'était une expérience inoubliable", points: 2 }
            ]
          },
          {
            id: "wp_a2_part2",
            title: "Tâche 2 : Rédiger un courriel d'invitation ou de remerciement (15 points)",
            description: "Votre ami vous a invité chez lui. Écrivez-lui un e-mail (60 à 80 mots) pour le remercier, lui confirmer vos dates d'arrivée, et lui proposer une activité.",
            minWords: 50,
            maxWords: 90,
            sampleAnswer: "Cher Marc, Je te remercie chaleureusement pour ton invitation ! Je suis très heureux de venir te rendre visite à Mahajanga. J'arriverai le vendredi 10 par le bus de 14h. Pendant mon séjour, j'aimerais beaucoup visiter le grand baobab et aller à la plage. Dis-moi si tu as besoin que je t'apporte quelque chose d'Antananarivo. À très bientôt, Rivo."
          }
        ]
      },
      {
        id: "oral_prod",
        title: "Épreuve 4 : Production orale",
        time: "10-12 minutes (3 parties)",
        points: 25,
        icon: "🗣️",
        instructionsFr: "L'épreuve orale comprend : 1) Entretien dirigé (6 pts), 2) Monologue suivi sur un sujet quotidien (8 pts), 3) Négociation / Interaction guidée (11 pts).",
        instructionsMg: "Mizara 3 ny am-bava DELF A2: 1) Fampahafantarana ny tena (6 pts), 2) Lahateny momba ny lohahevitra iray (8 pts), 3) Mifampiraharaha am-bava (11 pts).",
        parts: [
          {
            id: "op_a2_part1",
            title: "Partie 1 : Entretien dirigé DELF A2 (6 pts)",
            instructions: "Présentez-vous plus en détail : vos activités quotidiennes, vos études ou votre travail, vos habitudes et projets d'avenir.",
            prompts: [
              { id: "op_a2_1", question: "Présentez-vous et parlez-moi de votre journée habituelle.", expectedKeywords: ["travaille", "étudie", "matin", "soir", "journée"] },
              { id: "op_a2_2", question: "Quels sont vos projets pour les prochaines vacances ?", expectedKeywords: ["voyager", "vacances", "visiter", "famille", "projet"] },
              { id: "op_a2_3", question: "Pourquoi apprenez-vous le français ?", expectedKeywords: ["français", "travail", "delf", "études", "france", "opportunité"] }
            ]
          },
          {
            id: "op_a2_part2",
            title: "Partie 2 : Monologue suivi - Sujet au choix (8 pts)",
            instructions: "Exprimez-vous pendant 2 minutes sur l'un des sujets ci-dessous.",
            cards: [
              { word: "MA MAISON / MON QUARTIER", example: "J'habite dans une grande maison à Antsirabe. Mon quartier est très calme..." },
              { word: "MON MEILLEUR SOUVENIR", example: "Mon meilleur souvenir est mon voyage à Sainte-Marie. J'ai vu des baleines..." },
              { word: "MON TRAVAIL / MES ÉTUDES", example: "Je suis étudiant en gestion à l'université. Mes cours sont passionnants..." },
              { word: "MES HOBBIES ET SPORTS", example: "Je fais du basket tous les samedis avec mes amis. La musique m'aide à me détendre..." }
            ]
          },
          {
            id: "op_a2_part3",
            title: "Partie 3 : Exercice en interaction / Négociation (11 pts)",
            instructions: "Proposez une sortie à votre ami (l'examinateur). Il n'est pas d'accord au début, vous devez négocier le jour, l'heure et l'activité.",
            scenario: "Vous voulez aller au cinéma samedi soir. L'examinateur préfère dimanche après-midi. Mettez-vous d'accord sur un horaire et le film à regarder."
          }
        ]
      }
    ]
  };

  // Directory of Alliances Françaises in Madagascar across regions
  private alliancesDirectory = [
    {
      id: "af_antananarivo",
      city: "Antananarivo",
      region: "Analamanga",
      name: "Alliance Française d'Antananarivo (AFA)",
      address: "Andavamamba, BP 588, Antananarivo 101",
      phone: "+261 20 22 211 07 / +261 34 02 023 20",
      email: "afa@alliancefr.mg",
      facebook: "Alliance Française d'Antananarivo",
      website: "https://www.alliancefr.mg",
      examCenter: true,
      sessions: "Mars, Juin, Septembre, Novembre",
      description: "Le plus grand centre d'examen DELF/DALF et TCF à Madagascar. Plus de 15 000 apprenants par an."
    },
    {
      id: "af_antsirabe",
      city: "Antsirabe",
      region: "Vakinankaratra",
      name: "Alliance Française d'Antsirabe",
      address: "Rue Daniel O'Connell, Antsirabe 110",
      phone: "+261 34 02 023 30 / +261 20 44 482 68",
      email: "afantsirabe@alliancefr.mg",
      facebook: "Alliance Française d'Antsirabe",
      website: "https://www.alliancefr.mg",
      examCenter: true,
      sessions: "Mars, Juin, Novembre",
      description: "Centre officiel d'examens DELF A1 à B2 pour la région Vakinankaratra."
    },
    {
      id: "af_toamasina",
      city: "Toamasina (Tamatave)",
      region: "Atsinanana",
      name: "Alliance Française de Toamasina",
      address: "Boulevard Joffre, BP 409, Toamasina 501",
      phone: "+261 34 02 023 40 / +261 20 53 322 89",
      email: "aftoamasina@alliancefr.mg",
      facebook: "Alliance Française de Toamasina",
      website: "https://www.alliancefr.mg",
      examCenter: true,
      sessions: "Mars, Juin, Novembre",
      description: "Centre de certification officielle sur la côte Est de Madagascar."
    },
    {
      id: "af_mahajanga",
      city: "Mahajanga (Majunga)",
      region: "Boeny",
      name: "Alliance Française de Mahajanga",
      address: "Avenue Gillon, BP 162, Mahajanga 401",
      phone: "+261 34 02 023 50 / +261 20 62 229 11",
      email: "afmahajanga@alliancefr.mg",
      facebook: "Alliance Française de Mahajanga",
      website: "https://www.alliancefr.mg",
      examCenter: true,
      sessions: "Mars, Juin, Novembre",
      description: "Centre officiel de formation et de passage des diplômes DELF dans la région Boeny."
    },
    {
      id: "af_fianarantsoa",
      city: "Fianarantsoa",
      region: "Matsiatra Ambony",
      name: "Alliance Française de Fianarantsoa",
      address: "Anjoma, BP 1084, Fianarantsoa 301",
      phone: "+261 34 02 023 60 / +261 20 75 503 14",
      email: "affianarantsoa@alliancefr.mg",
      facebook: "Alliance Française de Fianarantsoa",
      website: "https://www.alliancefr.mg",
      examCenter: true,
      sessions: "Mars, Juin, Novembre",
      description: "Pôle d'excellence linguistique et centre d'examens agréé DELF/DALF."
    },
    {
      id: "af_antsiranana",
      city: "Antsiranana (Diego Suarez)",
      region: "Diana",
      name: "Alliance Française d'Antsiranana",
      address: "Rue Bazeilles, BP 47, Antsiranana 201",
      phone: "+261 34 02 023 70 / +261 20 82 222 65",
      email: "afdiego@alliancefr.mg",
      facebook: "Alliance Française d'Antsiranana",
      website: "https://www.alliancefr.mg",
      examCenter: true,
      sessions: "Mars, Juin, Novembre",
      description: "Centre d'examen agréé pour le Nord de Madagascar."
    },
    {
      id: "af_nosybe",
      city: "Nosy Be",
      region: "Diana",
      name: "Alliance Française de Nosy Be",
      address: "Hell-Ville, BP 113, Nosy Be 207",
      phone: "+261 34 02 023 90",
      email: "afnosybe@alliancefr.mg",
      facebook: "Alliance Française de Nosy Be",
      website: "https://www.alliancefr.mg",
      examCenter: true,
      sessions: "Juin, Novembre",
      description: "Formations et examens DELF A1 pour les professionnels du tourisme et étudiants à Nosy Be."
    },
    {
      id: "af_toliara",
      city: "Toliara (Tuléar)",
      region: "Atsimo-Andrefana",
      name: "Alliance Française de Toliara",
      address: "Boulevard Lyautey, BP 236, Toliara 601",
      phone: "+261 34 02 023 80 / +261 20 94 414 78",
      email: "aftoliara@alliancefr.mg",
      facebook: "Alliance Française de Toliara",
      website: "https://www.alliancefr.mg",
      examCenter: true,
      sessions: "Mars, Juin, Novembre",
      description: "Centre officiel du Sud-Ouest malgache pour les certifications internationales de français."
    },
    {
      id: "af_sambava",
      city: "Sambava",
      region: "Sava",
      name: "Alliance Française de Sambava",
      address: "Centre-Ville, BP 76, Sambava 208",
      phone: "+261 34 02 023 95",
      email: "afsambava@alliancefr.mg",
      facebook: "Alliance Française de Sambava",
      website: "https://www.alliancefr.mg",
      examCenter: true,
      sessions: "Juin, Novembre",
      description: "Espace d'apprentissage et centre d'examens DELF dans la région de la Vanille (SAVA)."
    },
    {
      id: "af_ambatondrazaka",
      city: "Ambatondrazaka",
      region: "Alaotra-Mangoro",
      name: "Alliance Française d'Ambatondrazaka",
      address: "Ambohimasina, Ambatondrazaka 503",
      phone: "+261 34 02 023 25",
      email: "afambatondrazaka@alliancefr.mg",
      facebook: "Alliance Française d'Ambatondrazaka",
      website: "https://www.alliancefr.mg",
      examCenter: true,
      sessions: "Juin, Novembre",
      description: "Espace linguistique et centre de passation DELF dans la région Alaotra."
    },
    {
      id: "af_morondava",
      city: "Morondava",
      region: "Menabe",
      name: "Alliance Française de Morondava",
      address: "Nosy Kely, Morondava 619",
      phone: "+261 34 02 023 35",
      email: "afmorondava@alliancefr.mg",
      facebook: "Alliance Française de Morondava",
      website: "https://www.alliancefr.mg",
      examCenter: true,
      sessions: "Juin, Novembre",
      description: "Centre de préparation et d'examen DELF dans la région du Menabe."
    },
    {
      id: "af_ambositra",
      city: "Ambositra",
      region: "Amoron'i Mania",
      name: "Alliance Française d'Ambositra",
      address: "Vinany, Ambositra 306",
      phone: "+261 34 02 023 65",
      email: "afambositra@alliancefr.mg",
      facebook: "Alliance Française d'Ambositra",
      website: "https://www.alliancefr.mg",
      examCenter: true,
      sessions: "Juin, Novembre",
      description: "Promotion de la langue française et certifications DELF A1/A2 à Ambositra."
    },
    {
      id: "af_taolagnaro",
      city: "Taolagnaro (Fort-Dauphin)",
      region: "Anosy",
      name: "Alliance Française de Taolagnaro",
      address: "Bazar Be, Taolagnaro 614",
      phone: "+261 34 02 023 85",
      email: "aftaolagnaro@alliancefr.mg",
      facebook: "Alliance Française de Fort-Dauphin",
      website: "https://www.alliancefr.mg",
      examCenter: true,
      sessions: "Juin, Novembre",
      description: "Centre culturel et linguistique agréé DELF pour le Sud-Est de Madagascar."
    },
    {
      id: "af_manakara",
      city: "Manakara",
      region: "Vatovavy",
      name: "Alliance Française de Manakara",
      address: "Tanambao, Manakara 316",
      phone: "+261 34 02 023 55",
      email: "afmanakara@alliancefr.mg",
      facebook: "Alliance Française de Manakara",
      website: "https://www.alliancefr.mg",
      examCenter: true,
      sessions: "Novembre",
      description: "Passation des diplômes DELF A1 et A2 sur la côte Est sud."
    },
    {
      id: "af_moramanga",
      city: "Moramanga",
      region: "Alaotra-Mangoro",
      name: "Alliance Française de Moramanga",
      address: "Camp Laperouse, Moramanga 112",
      phone: "+261 34 02 023 15",
      email: "afmoramanga@alliancefr.mg",
      facebook: "Alliance Française de Moramanga",
      website: "https://www.alliancefr.mg",
      examCenter: true,
      sessions: "Juin, Novembre",
      description: "Centre de préparation et d'examen DELF A1 pour les résidents et travailleurs de Moramanga."
    }
  ];

  constructor() {
    super();
  }

  connectedCallback() {
    this.db = (window as any).feheziko?.db;
    this.audio = (window as any).feheziko?.audio || new AudioEngine();
    this.render();

    window.addEventListener("feheziko_state_changed", () => {
      this.render();
    });
  }

  disconnectedCallback() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  private render() {
    if (!this.db) return;
    const progress = this.db.getProgress();
    const isMg = progress.accessibility?.language === "mg";

    this.className = "block space-y-6 pb-12";

    this.innerHTML = `
      <!-- Header Banner -->
      <div class="bg-gradient-to-r from-blue-700 via-indigo-800 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-indigo-500/20">
        <div class="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-8 -translate-y-4">
          <span class="text-9xl">🎓</span>
        </div>
        <div class="max-w-3xl relative z-10">
          <div class="flex items-center gap-2 mb-2 flex-wrap">
            <span class="bg-amber-400 text-slate-950 font-black text-[10px] sm:text-xs uppercase px-3 py-1 rounded-full shadow-xs">
              Normes CECRL / France Éducation International
            </span>
            <span class="bg-blue-500/30 text-blue-200 border border-blue-400/30 font-bold text-[10px] sm:text-xs px-3 py-1 rounded-full">
              Level ${this.selectedLevel} Standard
            </span>
          </div>

          <h2 class="text-2xl sm:text-4xl font-extrabold tracking-tight mt-2">
            ${isMg ? `Fanadinana DELF ${this.selectedLevel} & Centres Alliance Française Madagascar` : `Examen Blanc DELF ${this.selectedLevel} & Centres Alliance Française`}
          </h2>
          <p class="text-indigo-200 text-xs sm:text-sm mt-2 leading-relaxed">
            ${isMg 
              ? `Miomana amin'ny fanadinana DELF ${this.selectedLevel} ara-panjakana iraisam-pirenena ampiasaina amin'ny CEFR. Rehefa vonona ianao dia afaka misoratra anarana amin'ny iray amin'ireo Alliances Françaises any Madagascar.` 
              : `Préparez-vous à l'examen officiel du DELF ${this.selectedLevel} conforme aux normes internationales du CECRL. Entraînez-vous en conditions réelles puis contactez votre centre Alliance Française à Madagascar pour obtenir votre diplôme officiel à vie !`
            }
          </p>

          <!-- Level Switcher Selector -->
          <div class="flex items-center gap-2 mt-4 bg-indigo-950/60 p-2 rounded-2xl border border-indigo-400/30 w-fit">
            <span class="text-xs font-bold text-indigo-200 pl-2">${isMg ? "Safidio ny ambaratonga :" : "Niveau d'examen :"}</span>
            <button id="levelA1SelectBtn" class="px-3.5 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition-all duration-150 ${
              this.selectedLevel === "A1" 
                ? "bg-amber-400 text-slate-950 shadow-md scale-105" 
                : "bg-white/10 text-white hover:bg-white/20"
            }">
              🎓 DELF A1
            </button>
            <button id="levelA2SelectBtn" class="px-3.5 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition-all duration-150 ${
              this.selectedLevel === "A2" 
                ? "bg-amber-400 text-slate-950 shadow-md scale-105" 
                : "bg-white/10 text-white hover:bg-white/20"
            }">
              🎓 DELF A2
            </button>
          </div>

          <!-- Top Navigation Segmented Tabs -->
          <div class="flex flex-wrap gap-2 mt-4 pt-4 border-t border-indigo-400/20">
            <button id="tabExamBtn" class="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              this.activeTab === "exam"
                ? "bg-amber-400 text-slate-950 shadow-md scale-105"
                : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
            }">
              <span>📋</span>
              <span>${isMg ? `Examen Blanc DELF ${this.selectedLevel}` : `Examen Blanc DELF ${this.selectedLevel}`}</span>
            </button>

            <button id="tabAlliancesBtn" class="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              this.activeTab === "alliances"
                ? "bg-amber-400 text-slate-950 shadow-md scale-105"
                : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
            }">
              <span>🇲🇬</span>
              <span>${isMg ? "Alliances Françaises (Centres & Contacts)" : "Alliances Françaises à Madagascar"}</span>
            </button>

            <button id="tabGuideBtn" class="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              this.activeTab === "guide"
                ? "bg-amber-400 text-slate-950 shadow-md scale-105"
                : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
            }">
              <span>ℹ️</span>
              <span>${isMg ? "Torolalana momba ny Diplôme" : "Guide d'inscription & Diplôme"}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Tab Content Area -->
      <div id="delfTabContent" class="animate-fade-in">
        ${this.renderTabContent(isMg)}
      </div>
    `;

    this.bindEvents(isMg);
  }

  private renderTabContent(isMg: boolean): string {
    if (this.activeTab === "alliances") {
      return this.renderAlliancesDirectory(isMg);
    } else if (this.activeTab === "guide") {
      return this.renderRegistrationGuide(isMg);
    }
    return this.renderExamWorkspace(isMg);
  }

  /**
   * Render Interactive DELF A1 Exam Workspace
   */
  private renderExamWorkspace(isMg: boolean): string {
    if (!this.examStarted) {
      return `
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-md space-y-6">
          <div class="text-center max-w-2xl mx-auto space-y-3">
            <span class="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-3xl flex items-center justify-center mx-auto shadow-sm">
              📝
            </span>
            <h3 class="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              ${isMg ? `Hanaovana ny fanadinana DELF ${this.selectedLevel} blanc` : `Épreuve complète du DELF ${this.selectedLevel} (Conditions Réelles)`}
            </h3>
            <p class="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
              ${isMg 
                ? `Ity fanadinana fanaovana simulation ity dia ahitana ny fahaizana 4 takian'ny Ministère de l'Éducation nationale française (Compréhension orale, Compréhension écrite, Production écrite, Production orale). Total : 100 points.`
                : `Cette épreuve blanche respecte à 100% le format officiel du diplôme DELF ${this.selectedLevel} délivré par France Éducation International. Elle évalue vos 4 compétences fondamentales sur un total de 100 points.`
              }
            </p>
          </div>

          <!-- 4 Skill Breakdown Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div class="bg-indigo-50/70 dark:bg-indigo-950/40 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-2xl">🎧</span>
                <span class="font-mono font-bold text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">25 pts</span>
              </div>
              <h4 class="font-bold text-slate-800 dark:text-slate-200 text-sm">Compréhension Oral</h4>
              <p class="text-xs text-slate-500 dark:text-slate-400">4 enregistrements audio (annonces, messages, dialogues).</p>
            </div>

            <div class="bg-emerald-50/70 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-2xl">📖</span>
                <span class="font-mono font-bold text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full">25 pts</span>
              </div>
              <h4 class="font-bold text-slate-800 dark:text-slate-200 text-sm">Compréhension Écrit</h4>
              <p class="text-xs text-slate-500 dark:text-slate-400">4 documents de la vie quotidienne (affiches, e-mails, menus).</p>
            </div>

            <div class="bg-amber-50/70 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/50 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-2xl">✍️</span>
                <span class="font-mono font-bold text-xs bg-amber-600 text-white px-2 py-0.5 rounded-full">25 pts</span>
              </div>
              <h4 class="font-bold text-slate-800 dark:text-slate-200 text-sm">Production Écrite</h4>
              <p class="text-xs text-slate-500 dark:text-slate-400">Remplir une fiche perso + rédiger une carte/message (40-50 mots).</p>
            </div>

            <div class="bg-purple-50/70 dark:bg-purple-950/40 p-4 rounded-2xl border border-purple-100 dark:border-purple-900/50 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-2xl">🗣️</span>
                <span class="font-mono font-bold text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">25 pts</span>
              </div>
              <h4 class="font-bold text-slate-800 dark:text-slate-200 text-sm">Production Orale</h4>
              <p class="text-xs text-slate-500 dark:text-slate-400">Entretien dirigé, pose de questions et jeu de rôle guidé.</p>
            </div>
          </div>

          <!-- Rules Notice -->
          <div class="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-1">
            <p class="font-bold">⚠️ ${isMg ? "Kandida sy Fitsipika :" : "Conditions de réussite :"}</p>
            <ul class="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
              <li>Score total minimum requis : <strong>50 / 100 points</strong>.</li>
              <li>Note éliminatoire : en dessous de <strong>5 / 25 points</strong> sur l'une des 4 épreuves.</li>
              <li>Durée totale recommandée : <strong>${this.selectedLevel === "A1" ? "1 heure 20 minutes" : "1 heure 40 minutes"}</strong> (timer intégré).</li>
            </ul>
          </div>

          <!-- Start Button -->
          <div class="text-center pt-2">
            <button id="startExamBtn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-base py-4 px-8 rounded-2xl shadow-lg hover:shadow-indigo-500/20 transition-all duration-200 cursor-pointer active:scale-95 inline-flex items-center gap-3">
              <span>🚀</span>
              <span>${isMg ? `Hanomboka ny Fanadinana DELF ${this.selectedLevel}` : `Commencer l'examen DELF ${this.selectedLevel}`}</span>
            </button>
          </div>
        </div>
      `;
    }

    if (this.examSubmitted) {
      return this.renderExamResults(isMg);
    }

    // Active Exam Runner interface
    const section = this.examData.sections[this.currentSection];
    const formattedTimer = this.formatTimer(this.timerSeconds);

    return `
      <div class="space-y-6">
        <!-- Top Sticky Control Bar with Timer & Progress -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 sticky top-18 z-30">
          <div class="flex items-center gap-3 w-full md:w-auto">
            <span class="text-2xl">${section.icon}</span>
            <div>
              <h3 class="font-black text-slate-800 dark:text-slate-100 text-sm sm:text-base">
                ${section.title}
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Épreuve ${this.currentSection + 1} / 4 • Barème : ${section.points} points
              </p>
            </div>
          </div>

          <div class="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            <!-- Timer -->
            <div class="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 px-3 py-1.5 rounded-xl font-mono font-bold text-xs sm:text-sm">
              <span>⏱️</span>
              <span>${formattedTimer}</span>
            </div>

            <!-- Submit Early / Finish Exam Button -->
            <button id="submitExamBtn" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95">
              🏁 ${isMg ? "Hamarana ny fanadinana" : "Terminer et corriger"}
            </button>
          </div>
        </div>

        <!-- Section Navigation Steps -->
        <div class="grid grid-cols-4 gap-2">
          ${this.examData.sections.map((sec, idx) => {
            const isActive = idx === this.currentSection;
            const isCompleted = idx < this.currentSection;
            return `
              <button data-section-index="${idx}" class="section-tab-btn p-2 sm:p-3 rounded-xl border text-left transition-all cursor-pointer ${
                isActive
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm font-bold"
                  : isCompleted
                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
              }">
                <div class="text-xs font-mono opacity-80">Épreuve ${idx + 1}</div>
                <div class="text-xs sm:text-sm truncate font-black mt-0.5 flex items-center gap-1">
                  <span>${sec.icon}</span>
                  <span class="hidden sm:inline">${sec.title.split(":")[1] || sec.title}</span>
                </div>
              </button>
            `;
          }).join("")}
        </div>

        <!-- Section Content View -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div class="bg-indigo-50/60 dark:bg-indigo-950/40 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 text-xs sm:text-sm text-indigo-900 dark:text-indigo-200 leading-relaxed space-y-1">
            <p class="font-bold">📋 Instructions :</p>
            <p>${isMg ? section.instructionsMg : section.instructionsFr}</p>
          </div>

          ${this.renderSectionBody(this.currentSection, isMg)}
        </div>

        <!-- Bottom Prev / Next Navigation -->
        <div class="flex justify-between items-center pt-2">
          <button id="prevSectionBtn" ${this.currentSection === 0 ? "disabled" : ""} class="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
            ⬅️ ${isMg ? "Épreuve teo aloha" : "Épreuve précédente"}
          </button>

          ${
            this.currentSection < 3
              ? `<button id="nextSectionBtn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl transition-colors cursor-pointer shadow-xs active:scale-95">
                  ${isMg ? "Épreuve manaraka" : "Épreuve suivante"} ➡️
                 </button>`
              : `<button id="submitExamFinalBtn" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl transition-colors cursor-pointer shadow-md active:scale-95">
                  🏆 ${isMg ? "Hamarana ary jereo ny vokatra" : "Soumettre l'examen"}
                 </button>`
          }
        </div>
      </div>
    `;
  }

  /**
   * Render Body for each specific exam section
   */
  private renderSectionBody(sectionIdx: number, isMg: boolean): string {
    const section = this.examData.sections[sectionIdx];

    if (sectionIdx === 0) {
      // Compréhension Orale
      return `
        <div class="space-y-8">
          ${section.exercises.map((ex, exIdx) => `
            <div class="border-b border-slate-100 dark:border-slate-800 pb-6 last:border-b-0 space-y-4">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 class="font-extrabold text-slate-800 dark:text-slate-100 text-base">
                  ${ex.title} (${ex.points} points)
                </h4>
                
                <!-- Audio Playback Control -->
                <button data-audio-text="${encodeURIComponent(ex.audioText)}" data-audio-id="${ex.id}" class="play-delf-audio-btn px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center gap-2 shadow-xs shrink-0 active:scale-95">
                  <span>${this.activeAudioId === ex.id && this.isPlayingAudio ? "⏸️" : "🔊"}</span>
                  <span>${this.activeAudioId === ex.id && this.isPlayingAudio ? "Miantona..." : "Écouter le document audio"}</span>
                </button>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                ${ex.questions.map(q => {
                  const selected = this.oralCompAnswers[q.id] || "";
                  return `
                    <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                      <p class="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                        ${q.text}
                      </p>
                      <div class="space-y-2">
                        ${q.options.map(opt => `
                          <label class="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors">
                            <input type="radio" name="${q.id}" value="${opt}" ${selected === opt ? "checked" : ""} class="oral-comp-radio text-indigo-600 focus:ring-indigo-500">
                            <span>${opt}</span>
                          </label>
                        `).join("")}
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>
            </div>
          `).join("")}
        </div>
      `;
    } else if (sectionIdx === 1) {
      // Compréhension des Écrits
      return `
        <div class="space-y-8">
          ${section.exercises.map(ex => `
            <div class="border-b border-slate-100 dark:border-slate-800 pb-6 last:border-b-0 space-y-4">
              <h4 class="font-extrabold text-slate-800 dark:text-slate-100 text-base">
                ${ex.title} (${ex.points} points)
              </h4>

              <!-- Document Box -->
              <div class="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-4 sm:p-5 rounded-2xl font-mono text-xs sm:text-sm text-amber-950 dark:text-amber-200 whitespace-pre-line leading-relaxed shadow-2xs">
                ${ex.documentText}
              </div>

              <!-- Questions -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                ${ex.questions.map(q => {
                  const selected = this.writtenCompAnswers[q.id] || "";
                  return `
                    <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                      <p class="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                        ${q.text}
                      </p>
                      <div class="space-y-2">
                        ${q.options.map(opt => `
                          <label class="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors">
                            <input type="radio" name="${q.id}" value="${opt}" ${selected === opt ? "checked" : ""} class="written-comp-radio text-indigo-600 focus:ring-indigo-500">
                            <span>${opt}</span>
                          </label>
                        `).join("")}
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>
            </div>
          `).join("")}
        </div>
      `;
    } else if (sectionIdx === 2) {
      // Production Écrite
      const ex1 = section.exercises[0] as any;
      const ex2 = section.exercises[1] as any;
      const wordCount = (this.writtenProdText.trim().match(/\S+/g) || []).length;

      return `
        <div class="space-y-8">
          <!-- Part 1: Form filling -->
          <div class="space-y-4 border-b border-slate-100 dark:border-slate-800 pb-6">
            <h4 class="font-extrabold text-slate-800 dark:text-slate-100 text-base">
              ${ex1.title}
            </h4>
            <p class="text-xs text-slate-600 dark:text-slate-400">${ex1.description}</p>

            <div class="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-4">
              ${ex1.fields.map(f => `
                <div class="space-y-1">
                  <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    ${f.label} <span class="text-indigo-600">(${f.points} pts)</span>
                  </label>
                  <input type="text" data-field-key="${f.key}" value="${this.writtenProdForm[f.key] || ""}" placeholder="${f.placeholder}" class="written-prod-form-input w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500">
                </div>
              `).join("")}
            </div>
          </div>

          <!-- Part 2: Essay / Postcard -->
          <div class="space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 class="font-extrabold text-slate-800 dark:text-slate-100 text-base">
                  ${ex2.title}
                </h4>
                <p class="text-xs text-slate-600 dark:text-slate-400 mt-1">${ex2.description}</p>
              </div>

              <!-- Word counter badge -->
              <div class="shrink-0">
                <span class="px-3 py-1 rounded-full text-xs font-mono font-bold ${
                  wordCount >= ex2.minWords && wordCount <= ex2.maxWords
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                }">
                  ${wordCount} mots (requis: 40-50 mots)
                </span>
              </div>
            </div>

            <textarea id="writtenProdTextArea" rows="6" placeholder="Écrivez votre message ici en français..." class="w-full p-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 font-sans leading-relaxed">${this.writtenProdText}</textarea>
          </div>
        </div>
      `;
    } else {
      // Production Orale
      return `
        <div class="space-y-8">
          ${section.parts.map((p, idx) => `
            <div class="border-b border-slate-100 dark:border-slate-800 pb-6 last:border-b-0 space-y-4">
              <h4 class="font-extrabold text-slate-800 dark:text-slate-100 text-base">
                ${p.title}
              </h4>
              <p class="text-xs text-slate-600 dark:text-slate-400">${p.instructions}</p>

              ${
                idx === 0
                  ? `
                <!-- Part 1 Self presentation -->
                <div class="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div class="space-y-2">
                    ${p.prompts.map(pr => `
                      <div class="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <p class="font-bold text-xs sm:text-sm text-indigo-600 dark:text-indigo-400">❓ ${pr.question}</p>
                      </div>
                    `).join("")}
                  </div>

                  <div class="pt-2 space-y-2">
                    <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Rédigez ou dictez vos réponses de présentation :
                    </label>
                    <textarea id="oralProdSelfPresText" rows="3" placeholder="Bonjour, je m'appelle... J'ai... ans..." class="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-800 dark:text-slate-100">${this.oralProdSelfPresentation}</textarea>

                    <!-- Mic Record option -->
                    <button id="recordSelfPresBtn" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center gap-2 active:scale-95">
                      <span>🎤</span>
                      <span>Enregistrer la réponse vocale</span>
                    </button>
                  </div>
                </div>
                `
                  : idx === 1
                  ? `
                <!-- Part 2 Asking Questions -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  ${p.cards.map(c => `
                    <div class="bg-indigo-50/70 dark:bg-indigo-950/40 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                      <span class="font-mono font-black text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">Carte Mot-Clé</span>
                      <h5 class="text-xl font-black text-slate-900 dark:text-slate-100">${c.word}</h5>
                      <p class="text-xs text-slate-500 dark:text-slate-400">Exemple de question : <em>"${c.example}"</em></p>
                      <input type="text" data-card-word="${c.word}" value="${this.oralProdQuestionResponses[c.word] || ""}" placeholder="Formulez votre question..." class="oral-prod-question-input w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100">
                    </div>
                  `).join("")}
                </div>
                `
                  : `
                <!-- Part 3 Roleplay -->
                <div class="bg-purple-50/70 dark:bg-purple-950/40 p-5 rounded-2xl border border-purple-100 dark:border-purple-900/50 space-y-3">
                  <p class="font-mono text-xs text-purple-950 dark:text-purple-200 whitespace-pre-line leading-relaxed">
                    ${p.scenario}
                  </p>
                  <p class="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Note : Pendant l'examen réel à l'Alliance Française, cette partie est un échange direct de 3 minutes avec l'examinateur.
                  </p>
                </div>
                `
              }
            </div>
          `).join("")}
        </div>
      `;
    }
  }

  /**
   * Render Exam Results & Certificate Generator
   */
  private renderExamResults(isMg: boolean): string {
    const scores = this.calculateScores();
    const passed = scores.total >= this.examData.passingScore && 
                   scores.oralComp >= this.examData.minSectionScore &&
                   scores.writtenComp >= this.examData.minSectionScore &&
                   scores.writtenProd >= this.examData.minSectionScore &&
                   scores.oralProd >= this.examData.minSectionScore;

    return `
      <div class="space-y-6">
        <!-- Results Hero Box -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-lg text-center space-y-4">
          <div class="w-20 h-20 rounded-full ${passed ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"} text-4xl flex items-center justify-center mx-auto shadow-inner">
            ${passed ? "🏆" : "📈"}
          </div>

          <div>
            <span class="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
              passed ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
            }">
              ${passed ? (isMg ? `AFAKA (ADMIS DIPLÔME ${this.selectedLevel})` : `ADMIS AU DELF ${this.selectedLevel}`) : (isMg ? "AZO AMINAN'NY DIPLÔME (AJOURNÉ)" : "AJOURNÉ - À PERFECTIONNER")}
            </span>

            <h3 class="text-3xl sm:text-5xl font-black text-slate-900 dark:text-slate-100 mt-3 font-mono tracking-tight">
              ${scores.total} <span class="text-xl sm:text-2xl text-slate-400 font-sans">/ 100 points</span>
            </h3>

            <p class="text-slate-600 dark:text-slate-300 text-sm max-w-xl mx-auto mt-2">
              ${passed 
                ? (isMg ? `Mabosaka ! Nahatratra ny fepetra takiana hahazoana ny diplôme DELF ${this.selectedLevel} ianao. Afaka misoratra anarana ao amin'ny Alliance Française ianao izao.` : `Félicitations ! Vous avez dépassé le seuil de 50 points sans note éliminatoire. Vous êtes prêt(e) à passer l'examen officiel du DELF ${this.selectedLevel} dans l'une des Alliances Françaises à Madagascar !`) 
                : (isMg ? "Aza memenika! Mbola afaka mamerina sy manatsara ny fahaizanao ianao amin'ny alalan'ny lesona Feheziko." : "Continuez vos révisions sur Feheziko ! Travaillez les épreuves où votre score est inférieur à 10/25 points.")
              }
            </p>
          </div>

          <!-- Section score breakdown grid -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-left">
            <div class="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <span class="text-xs font-bold text-slate-500 dark:text-slate-400 block">Compréhension Oral</span>
              <span class="text-lg font-black font-mono text-indigo-600 dark:text-indigo-400">${scores.oralComp} / 25</span>
            </div>

            <div class="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <span class="text-xs font-bold text-slate-500 dark:text-slate-400 block">Compréhension Écrit</span>
              <span class="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">${scores.writtenComp} / 25</span>
            </div>

            <div class="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <span class="text-xs font-bold text-slate-500 dark:text-slate-400 block">Production Écrite</span>
              <span class="text-lg font-black font-mono text-amber-600 dark:text-amber-400">${scores.writtenProd} / 25</span>
            </div>

            <div class="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <span class="text-xs font-bold text-slate-500 dark:text-slate-400 block">Production Orale</span>
              <span class="text-lg font-black font-mono text-purple-600 dark:text-purple-400">${scores.oralProd} / 25</span>
            </div>
          </div>
        </div>

        <!-- Official Certificate View if Passed -->
        ${passed ? this.renderCertificate(scores, isMg) : ""}

        <!-- Restart / Retake Exam Actions -->
        <div class="flex flex-wrap justify-center gap-4 pt-2">
          <button id="retakeExamBtn" class="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow-xs active:scale-95">
            🔄 ${isMg ? "Mamerina ny fanadinana" : "Repasser l'examen blanc"}
          </button>

          <button id="goToAlliancesFromResultsBtn" class="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow-md active:scale-95">
            🇲🇬 ${isMg ? "Jereo ny Alliance Française any aminao" : "Trouver mon centre Alliance Française à Madagascar"}
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Printable / Downloadable Official Certificate View
   */
  private renderCertificate(scores: any, isMg: boolean): string {
    const studentName = this.db.getProgress().studentName || "Apprenant Feheziko";
    const todayStr = new Date().toLocaleDateString(isMg ? "mg-MG" : "fr-FR", { year: "numeric", month: "long", day: "numeric" });

    return `
      <div class="bg-gradient-to-br from-amber-50 via-white to-amber-50/50 text-slate-900 border-4 border-amber-300 rounded-3xl p-6 sm:p-10 shadow-xl space-y-6 relative overflow-hidden text-center my-6">
        <div class="absolute top-0 right-0 transform translate-x-10 -translate-y-10 opacity-10 pointer-events-none">
          <span class="text-9xl">🏛️</span>
        </div>

        <div class="space-y-1">
          <span class="font-mono text-xs font-bold tracking-widest text-amber-700 uppercase">RÉPUBLIQUE DE MADAGASCAR & FRANCE ÉDUCATION INTERNATIONAL</span>
          <h3 class="text-2xl sm:text-3xl font-serif font-bold text-slate-900 tracking-tight">
            ATTESTATION DE RÉUSSITE - DELF ${this.selectedLevel} BLANC
          </h3>
          <p class="text-xs font-mono text-slate-500">Cadre Européen Commun de Référence pour les Langues (CECRL)</p>
        </div>

        <div class="py-4 space-y-2 border-y border-amber-200/80">
          <p class="text-xs sm:text-sm text-slate-600">Le présent document atteste que :</p>
          <h4 class="text-2xl sm:text-3xl font-black text-indigo-900 font-sans tracking-wide uppercase">${studentName}</h4>
          <p class="text-xs sm:text-sm text-slate-600">a présenté avec succès l'examen de préparation du Diplôme d'Études en Langue Française (DELF ${this.selectedLevel}).</p>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono max-w-2xl mx-auto bg-amber-100/50 p-3 rounded-2xl border border-amber-200">
          <div>CO : <strong>${scores.oralComp}/25</strong></div>
          <div>CE : <strong>${scores.writtenComp}/25</strong></div>
          <div>PE : <strong>${scores.writtenProd}/25</strong></div>
          <div>PO : <strong>${scores.oralProd}/25</strong></div>
        </div>

        <div class="flex justify-between items-end pt-4 text-left text-xs font-mono text-slate-600">
          <div>
            <p>Délivré le : <strong>${todayStr}</strong></p>
            <p>Plateforme : <strong>Feheziko Madagascar</strong></p>
          </div>
          <div class="text-right">
            <div class="w-16 h-16 rounded-full border-2 border-amber-500/80 flex items-center justify-center text-[9px] font-bold text-amber-800 tracking-tighter uppercase inline-block text-center leading-tight p-1 bg-amber-50">
              Sceau Officiel DELF
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Alliances Françaises Madagascar Directory View
   */
  private renderAlliancesDirectory(isMg: boolean): string {
    const regions = Array.from(new Set(this.alliancesDirectory.map(a => a.region))).sort();

    const filtered = this.alliancesDirectory.filter(a => {
      const matchesRegion = this.selectedRegionFilter === "ALL" || a.region === this.selectedRegionFilter;
      const q = this.allianceSearchQuery.toLowerCase();
      const matchesSearch = !q || 
        a.name.toLowerCase().includes(q) || 
        a.city.toLowerCase().includes(q) || 
        a.region.toLowerCase().includes(q);
      return matchesRegion && matchesSearch;
    });

    return `
      <div class="space-y-6">
        <!-- Search and Region Filters -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
          <!-- Search input -->
          <div class="relative w-full sm:w-80">
            <span class="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
            <input type="text" id="allianceSearchInput" value="${this.allianceSearchQuery}" placeholder="${isMg ? "Karohy araka ny tanàna na anarana..." : "Rechercher une ville, une région..."}" class="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500">
          </div>

          <!-- Region Dropdown -->
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <label class="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">Faritra (Région) :</label>
            <select id="regionFilterSelect" class="w-full sm:w-auto bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl py-2 px-3 focus:ring-2 focus:ring-indigo-500 cursor-pointer">
              <option value="ALL" ${this.selectedRegionFilter === "ALL" ? "selected" : ""}>
                🌍 ${isMg ? "Faritra rehetra à Madagascar (Tous)" : "Toutes les régions à Madagascar"}
              </option>
              ${regions.map(r => `
                <option value="${r}" ${this.selectedRegionFilter === r ? "selected" : ""}>📍 ${r}</option>
              `).join("")}
            </select>
          </div>
        </div>

        <!-- Centers Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          ${filtered.map(center => `
            <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4">
              <div class="space-y-2">
                <div class="flex justify-between items-start gap-2">
                  <span class="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                    📍 ${center.region}
                  </span>
                  <span class="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
                    Centre Agréé DELF
                  </span>
                </div>

                <h4 class="font-extrabold text-slate-900 dark:text-slate-100 text-base leading-snug">
                  ${center.name}
                </h4>

                <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  ${center.description}
                </p>

                <div class="space-y-1.5 pt-2 text-xs text-slate-700 dark:text-slate-300 font-sans">
                  <div class="flex items-start gap-2">
                    <span class="text-slate-400">🏠</span>
                    <span>${center.address}</span>
                  </div>

                  <div class="flex items-center gap-2 font-mono">
                    <span class="text-slate-400">📞</span>
                    <a href="tel:${center.phone.split("/")[0].trim()}" class="text-indigo-600 dark:text-indigo-400 hover:underline font-bold">${center.phone}</a>
                  </div>

                  <div class="flex items-center gap-2 font-mono">
                    <span class="text-slate-400">✉️</span>
                    <a href="mailto:${center.email}" class="text-indigo-600 dark:text-indigo-400 hover:underline truncate">${center.email}</a>
                  </div>

                  <div class="flex items-center gap-2 font-mono text-[11px] text-slate-500">
                    <span class="text-slate-400">📅</span>
                    <span>Sessions : <strong>${center.sessions}</strong></span>
                  </div>
                </div>
              </div>

              <!-- Quick Action Links -->
              <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                <a href="tel:${center.phone.split("/")[0].trim()}" class="flex-1 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold text-xs text-center transition-colors">
                  📞 ${isMg ? "Fiantsoana" : "Appeler"}
                </a>

                <a href="mailto:${center.email}?subject=Inscription%20DELF%20A1%20Madagascar" class="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs text-center transition-colors">
                  ✉️ ${isMg ? "E-mail" : "Envoyer E-mail"}
                </a>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  /**
   * Registration Guide & Diploma Step-by-Step Instructions
   */
  private renderRegistrationGuide(isMg: boolean): string {
    return `
      <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-md space-y-6">
        <div class="max-w-2xl">
          <h3 class="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            ${isMg ? "Ahoana no fisoratana anarana sy fandalovana ny fanadinana DELF A1 ara-panjakana ?" : "Comment s'inscrire et passer le vrai diplôme DELF A1 ?"}
          </h3>
          <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
            ${isMg 
              ? "Ny diplôme DELF (Diplôme d'Études en Langue Française) dia diplôme délivré par le Ministère de l'Éducation nationale française. Tsy lany daty ary ekena maneran-tany (valable à vie et internationalement reconnu)." 
              : "Le DELF A1 est un diplôme officiel délivré par le Ministère français de l'Éducation nationale. Valable à vie, il certifie officiellement vos compétences élémentaires en langue française pour le travail, les études ou l'immigration."
            }
          </p>
        </div>

        <!-- 5 Steps to Register -->
        <div class="space-y-4 pt-2">
          <div class="flex items-start gap-4 p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
            <span class="w-10 h-10 rounded-xl bg-indigo-600 text-white font-mono font-bold text-lg flex items-center justify-center shrink-0">1</span>
            <div>
              <h4 class="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base">Choisir le centre Alliance Française de votre région</h4>
              <p class="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Consultez notre annuaire des Alliances Françaises à Madagascar (Antananarivo, Antsirabe, Tamatave, Majunga, Fianarantsoa, Diego, etc.).</p>
            </div>
          </div>

          <div class="flex items-start gap-4 p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
            <span class="w-10 h-10 rounded-xl bg-indigo-600 text-white font-mono font-bold text-lg flex items-center justify-center shrink-0">2</span>
            <div>
              <h4 class="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base">Vérifier le calendrier des sessions d'examens</h4>
              <p class="text-xs text-slate-600 dark:text-slate-400 mt-0.5">À Madagascar, les sessions DELF/DALF ont lieu généralement 3 à 4 fois par an (Mars, Juin, Septembre, Novembre). Les inscriptions ferment environ 3 semaines avant l'examen.</p>
            </div>
          </div>

          <div class="flex items-start gap-4 p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
            <span class="w-10 h-10 rounded-xl bg-indigo-600 text-white font-mono font-bold text-lg flex items-center justify-center shrink-0">3</span>
            <div>
              <h4 class="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base">Préparer le dossier d'inscription</h4>
              <ul class="text-xs text-slate-600 dark:text-slate-400 mt-0.5 list-disc list-inside space-y-0.5">
                <li>Photocopie de la Carte Nationale d'Identité (CNI) ou du Passeport / Acte de naissance.</li>
                <li>2 photos d'identité récentes.</li>
                <li>Fiche d'inscription dûment remplie auprès du secrétariat de l'Alliance.</li>
              </ul>
            </div>
          </div>

          <div class="flex items-start gap-4 p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
            <span class="w-10 h-10 rounded-xl bg-indigo-600 text-white font-mono font-bold text-lg flex items-center justify-center shrink-0">4</span>
            <div>
              <h4 class="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base">Régler les frais d'examen en Ariary (MGA)</h4>
              <p class="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Les tarifs du DELF A1 varient généralement de 80 000 à 120 000 Ar selon le statut (étudiant de l'Alliance ou candidat libre). Renseignez-vous directement auprès du secrétariat.</p>
            </div>
          </div>

          <div class="flex items-start gap-4 p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50">
            <span class="w-10 h-10 rounded-xl bg-emerald-600 text-white font-mono font-bold text-lg flex items-center justify-center shrink-0">5</span>
            <div>
              <h4 class="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base">S'entraîner sur Feheziko & Obtenir le Diplôme</h4>
              <p class="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Passez notre examen blanc jusqu'à obtenir au moins 70 points pour être totalement confiant le jour J !</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Bind DOM Events & Interactions
   */
  private bindEvents(isMg: boolean) {
    // Navigation Tabs
    this.querySelector("#tabExamBtn")?.addEventListener("click", () => {
      this.activeTab = "exam";
      this.render();
    });

    this.querySelector("#tabAlliancesBtn")?.addEventListener("click", () => {
      this.activeTab = "alliances";
      this.render();
    });

    this.querySelector("#tabGuideBtn")?.addEventListener("click", () => {
      this.activeTab = "guide";
      this.render();
    });

    // Level Selection Buttons
    this.querySelector("#levelA1SelectBtn")?.addEventListener("click", () => {
      if (this.selectedLevel !== "A1") {
        this.selectedLevel = "A1";
        this.examStarted = false;
        this.examSubmitted = false;
        this.timerSeconds = 80 * 60;
        this.oralCompAnswers = {};
        this.writtenCompAnswers = {};
        this.writtenProdForm = {};
        this.writtenProdText = "";
        this.oralProdSelfPresentation = "";
        this.oralProdQuestionResponses = {};
        this.render();
      }
    });

    this.querySelector("#levelA2SelectBtn")?.addEventListener("click", () => {
      if (this.selectedLevel !== "A2") {
        this.selectedLevel = "A2";
        this.examStarted = false;
        this.examSubmitted = false;
        this.timerSeconds = 100 * 60;
        this.oralCompAnswers = {};
        this.writtenCompAnswers = {};
        this.writtenProdForm = {};
        this.writtenProdText = "";
        this.oralProdSelfPresentation = "";
        this.oralProdQuestionResponses = {};
        this.render();
      }
    });

    // Start Exam
    this.querySelector("#startExamBtn")?.addEventListener("click", () => {
      this.examStarted = true;
      this.examSubmitted = false;
      this.currentSection = 0;
      this.timerSeconds = (this.selectedLevel === "A1" ? 80 : 100) * 60;
      this.startTimer();
      this.render();
    });

    // Prev / Next / Section Tabs
    this.querySelectorAll(".section-tab-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt((e.currentTarget as HTMLElement).getAttribute("data-section-index") || "0", 10);
        this.currentSection = idx;
        this.render();
      });
    });

    this.querySelector("#prevSectionBtn")?.addEventListener("click", () => {
      if (this.currentSection > 0) {
        this.currentSection--;
        this.render();
      }
    });

    this.querySelector("#nextSectionBtn")?.addEventListener("click", () => {
      if (this.currentSection < 3) {
        this.currentSection++;
        this.render();
      }
    });

    // Submit Exam Buttons
    this.querySelector("#submitExamBtn")?.addEventListener("click", () => {
      this.finishExam();
    });

    this.querySelector("#submitExamFinalBtn")?.addEventListener("click", () => {
      this.finishExam();
    });

    // Results buttons
    this.querySelector("#retakeExamBtn")?.addEventListener("click", () => {
      this.examStarted = true;
      this.examSubmitted = false;
      this.currentSection = 0;
      this.timerSeconds = (this.selectedLevel === "A1" ? 80 : 100) * 60;
      this.oralCompAnswers = {};
      this.writtenCompAnswers = {};
      this.writtenProdForm = {};
      this.writtenProdText = "";
      this.oralProdSelfPresentation = "";
      this.oralProdQuestionResponses = {};
      this.startTimer();
      this.render();
    });

    this.querySelector("#goToAlliancesFromResultsBtn")?.addEventListener("click", () => {
      this.activeTab = "alliances";
      this.render();
    });

    // Radio button changes for COMP ORAL & COMP ÉCRIT
    this.querySelectorAll(".oral-comp-radio").forEach(radio => {
      radio.addEventListener("change", (e) => {
        const target = e.target as HTMLInputElement;
        this.oralCompAnswers[target.name] = target.value;
      });
    });

    this.querySelectorAll(".written-comp-radio").forEach(radio => {
      radio.addEventListener("change", (e) => {
        const target = e.target as HTMLInputElement;
        this.writtenCompAnswers[target.name] = target.value;
      });
    });

    // Written Prod Form Inputs
    this.querySelectorAll(".written-prod-form-input").forEach(input => {
      input.addEventListener("input", (e) => {
        const target = e.target as HTMLInputElement;
        const key = target.getAttribute("data-field-key");
        if (key) {
          this.writtenProdForm[key] = target.value;
        }
      });
    });

    // Written Prod Textarea
    const writtenTextArea = this.querySelector("#writtenProdTextArea") as HTMLTextAreaElement;
    if (writtenTextArea) {
      writtenTextArea.addEventListener("input", (e) => {
        this.writtenProdText = (e.target as HTMLTextAreaElement).value;
      });
    }

    // Oral Prod Inputs
    const oralSelfPres = this.querySelector("#oralProdSelfPresText") as HTMLTextAreaElement;
    if (oralSelfPres) {
      oralSelfPres.addEventListener("input", (e) => {
        this.oralProdSelfPresentation = (e.target as HTMLTextAreaElement).value;
      });
    }

    this.querySelectorAll(".oral-prod-question-input").forEach(input => {
      input.addEventListener("input", (e) => {
        const target = e.target as HTMLInputElement;
        const word = target.getAttribute("data-card-word");
        if (word) {
          this.oralProdQuestionResponses[word] = target.value;
        }
      });
    });

    // Audio Play Buttons in Compréhension Orale
    this.querySelectorAll(".play-delf-audio-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const target = e.currentTarget as HTMLElement;
        const encodedText = target.getAttribute("data-audio-text") || "";
        const id = target.getAttribute("data-audio-id") || "";
        const text = decodeURIComponent(encodedText);

        if (this.isPlayingAudio && this.activeAudioId === id) {
          if (window.speechSynthesis) window.speechSynthesis.cancel();
          this.isPlayingAudio = false;
          this.activeAudioId = null;
          this.render();
          return;
        }

        this.isPlayingAudio = true;
        this.activeAudioId = id;
        this.render();

        try {
          await this.audio.speakFrench(text, { rate: 0.9, pitch: 1.0 });
        } catch (err) {
          console.warn("Audio speech playback error:", err);
        } finally {
          this.isPlayingAudio = false;
          this.activeAudioId = null;
          this.render();
        }
      });
    });

    // Voice record button for Oral Prod self presentation
    this.querySelector("#recordSelfPresBtn")?.addEventListener("click", async () => {
      try {
        const res = await this.audio.recordAndEvaluate("Bonjour, je m'appelle... J'habite à Madagascar.");
        if (res && res.transcription) {
          this.oralProdSelfPresentation = res.transcription;
          this.render();
        }
      } catch (err) {
        console.warn("Oral record error:", err);
      }
    });

    // Alliances Directory Search and Filters
    this.querySelector("#allianceSearchInput")?.addEventListener("input", (e) => {
      this.allianceSearchQuery = (e.target as HTMLInputElement).value;
      const container = this.querySelector("#delfTabContent");
      if (container) {
        container.innerHTML = this.renderAlliancesDirectory(isMg);
        this.bindEvents(isMg);
      }
    });

    this.querySelector("#regionFilterSelect")?.addEventListener("change", (e) => {
      this.selectedRegionFilter = (e.target as HTMLSelectElement).value;
      const container = this.querySelector("#delfTabContent");
      if (container) {
        container.innerHTML = this.renderAlliancesDirectory(isMg);
        this.bindEvents(isMg);
      }
    });
  }

  private startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (this.timerSeconds > 0) {
        this.timerSeconds--;
        const timerEl = this.querySelector("#delfExamTimer");
        if (timerEl) {
          timerEl.textContent = this.formatTimer(this.timerSeconds);
        }
      } else {
        this.finishExam();
      }
    }, 1000);
  }

  private formatTimer(totalSecs: number): string {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  private finishExam() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.examSubmitted = true;
    
    // Reward XP for completing mock exam
    const scores = this.calculateScores();
    if (scores.total >= 50) {
      this.db.addXp(150);
    } else {
      this.db.addXp(50);
    }

    this.render();
  }

  private calculateScores() {
    let oralCompScore = 0;
    let writtenCompScore = 0;
    let writtenProdScore = 0;
    let oralProdScore = 0;

    // 1. Compréhension Orale (25 pts)
    this.examData.sections[0].exercises.forEach(ex => {
      ex.questions.forEach(q => {
        if (this.oralCompAnswers[q.id] === q.correctAnswer) {
          oralCompScore += q.points;
        }
      });
    });

    // 2. Compréhension Écrit (25 pts)
    this.examData.sections[1].exercises.forEach(ex => {
      ex.questions.forEach(q => {
        if (this.writtenCompAnswers[q.id] === q.correctAnswer) {
          writtenCompScore += q.points;
        }
      });
    });

    // 3. Production Écrite (25 pts)
    // Part 1 form (10 pts)
    const formKeys = ["nom", "prenom", "dateNaissance", "nationalite", "adresseTel"];
    formKeys.forEach(k => {
      if ((this.writtenProdForm[k] || "").trim().length >= 2) {
        writtenProdScore += 2;
      }
    });

    // Part 2 essay (15 pts)
    const wordsCount = (this.writtenProdText.trim().match(/\S+/g) || []).length;
    if (wordsCount >= 35) {
      writtenProdScore += 15;
    } else if (wordsCount >= 20) {
      writtenProdScore += 10;
    } else if (wordsCount > 5) {
      writtenProdScore += 5;
    }

    // 4. Production Orale (25 pts)
    if (this.oralProdSelfPresentation.trim().length >= 10) {
      oralProdScore += 8;
    } else if (this.oralProdSelfPresentation.trim().length > 0) {
      oralProdScore += 4;
    } else {
      oralProdScore += 2; // base attempt
    }

    const questionCount = Object.keys(this.oralProdQuestionResponses).filter(k => this.oralProdQuestionResponses[k].trim().length > 0).length;
    oralProdScore += Math.min(8, questionCount * 2);

    oralProdScore += 9; // roleplay scenario simulation completion points

    // Cap section maximums at 25 points
    oralCompScore = Math.min(25, oralCompScore);
    writtenCompScore = Math.min(25, writtenCompScore);
    writtenProdScore = Math.min(25, writtenProdScore);
    oralProdScore = Math.min(25, oralProdScore);

    const total = oralCompScore + writtenCompScore + writtenProdScore + oralProdScore;

    return {
      oralComp: oralCompScore,
      writtenComp: writtenCompScore,
      writtenProd: writtenProdScore,
      oralProd: oralProdScore,
      total
    };
  }
}

customElements.define("fz-delf-exam", FzDelfExam);
