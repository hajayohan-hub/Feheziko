import json

# Load fr.json
with open("src/languages/fr.json", "r", encoding="utf-8") as f:
    data = json.load(f)

dialogues = [
    {
        "id": "d1",
        "level": "A1",
        "category": "children",
        "title": "Ao an-tsena (Au Marché d'Anosibe)",
        "situation": "Mividy legioma sy voankazo amin'ny mpivarotra ramatoa ny zazalahy kely iray.",
        "roles": {
            "A": "Petit garçon (Zazalahy kely)",
            "B": "Marchande (Mpivarotra ramatoa)"
        },
        "voices": {
            "A": {"type": "child_boy", "gender": "male", "age": "child", "label": "Garçon 👦 (Enfant)", "avatar": "👦"},
            "B": {"type": "female", "gender": "female", "age": "adult", "label": "Femme 👩 (Marchande)", "avatar": "👩"}
        },
        "lines": [
            {"speaker": "A", "french": "Bonjour madame, est-ce que vous avez des tomates ?", "malagasy": "Manao ahoana ramatoa, misy voatabia ve any aminao ?", "audio_id": "d1_1"},
            {"speaker": "B", "french": "Oui mon fils, elles sont très fraîches. C'est deux mille Ariary le kilo.", "malagasy": "Eny anaka, tena mbola vaovao tsara ireto. Roa arivo Ariary ny kilao.", "audio_id": "d1_2"},
            {"speaker": "A", "french": "D'accord, donnez-moi un kilo s'il vous plaît. Et combien coûtent ces bananes ?", "malagasy": "Eny ary, omeo iray kilao aho azafady. Ary ohatrinona ireto akondro ireto ?", "audio_id": "d1_3"},
            {"speaker": "B", "french": "Les bananes font cinq cents Ariary la pièce. Elles sont bien sucrées !", "malagasy": "Dimanjato Ariary ny iray amin'ny akondro. Tena mamy tsara mihitsy !", "audio_id": "d1_4"},
            {"speaker": "A", "french": "Je vais en prendre quatre. Ça fait combien au total ?", "malagasy": "Haka efatra aho. Ohatrinona izany fitambarany izany ?", "audio_id": "d1_5"},
            {"speaker": "B", "french": "Alors, deux mille pour les tomates et deux mille pour les bananes. Ça fait quatre mille Ariary.", "malagasy": "Izany hoe, roa arivo ny voatabia ary roa arivo ny akondro. Efatra arivo Ariary izany.", "audio_id": "d1_6"}
        ]
    },
    {
        "id": "d2",
        "level": "A1",
        "category": "adults",
        "title": "Mitady asa sy dinidinika (Entretien d'embauche)",
        "situation": "Dinidinika eo amin'ny vehivavy mpitady asa sy ny lehilahy mpanadinika.",
        "roles": {
            "A": "Candidate (Vehivavy mpitady asa)",
            "B": "Recruteur (Lehilahy mpanadinika)"
        },
        "voices": {
            "A": {"type": "female", "gender": "female", "age": "adult", "label": "Femme 👩 (Candidate)", "avatar": "👩"},
            "B": {"type": "male", "gender": "male", "age": "adult", "label": "Homme 👨 (Recruteur)", "avatar": "👨"}
        },
        "lines": [
            {"speaker": "B", "french": "Bonjour madame, installez-vous. Parlez-moi de votre parcours professionnel.", "malagasy": "Manao ahoana ramatoa, mipetraha azafady. Tantarao amiko ny momba ny traikefanao.", "audio_id": "d2_1"},
            {"speaker": "A", "french": "Bonjour monsieur. J'ai travaillé trois ans comme comptable à Antananarivo.", "malagasy": "Manao ahoana tompoko. Niasa telo taona tamin'ny maha mpitana kaonty aho tao Antananarivo.", "audio_id": "d2_2"},
            {"speaker": "B", "french": "Très bien. Quelles sont vos principales qualités pour ce poste ?", "malagasy": "Tena tsara. Inona avy no toetra sy fahaizana mampiavaka anao amin'ity asa ity ?", "audio_id": "d2_3"},
            {"speaker": "A", "french": "Je suis rigoureuse, ponctuelle et j'aime travailler en équipe.", "malagasy": "Tena madio sy mazava amin'ny asa aho, mitandrina ora ary tia miara-miasa amin'ny namana.", "audio_id": "d2_4"},
            {"speaker": "B", "french": "Parfait. Quand seriez-vous disponible pour commencer ?", "malagasy": "Tena tsara. Rahoviana ianao no afaka manomboka miasa ?", "audio_id": "d2_5"},
            {"speaker": "A", "french": "Je suis disponible dès le début du mois prochain, monsieur.", "malagasy": "Afaka manomboka amin'ny fiandohan'ny mois ho avy io hatrany aho, tompoko.", "audio_id": "d2_6"}
        ]
    },
    {
        "id": "d3",
        "level": "A1",
        "category": "adults",
        "title": "Fandraisana taxi (Dans le taxi-ville)",
        "situation": "Fifanakalozana eo amin'ny vehivavy mpandeha sy ny lehilahy mpamily taxi.",
        "roles": {
            "A": "Passagère (Vehivavy mpandeha)",
            "B": "Chauffeur de taxi (Lehilahy mpamily)"
        },
        "voices": {
            "A": {"type": "female", "gender": "female", "age": "adult", "label": "Femme 👩 (Passagère)", "avatar": "👩"},
            "B": {"type": "male", "gender": "male", "age": "adult", "label": "Homme 👨 (Chauffeur)", "avatar": "👨"}
        },
        "lines": [
            {"speaker": "A", "french": "Bonjour chauffeur ! Combien pour aller à Anosy s'il vous plaît ?", "malagasy": "Manao ahoana mpamily ! Ohatrinona ny mankany Anosy azafady ?", "audio_id": "d3_1"},
            {"speaker": "B", "french": "Bonjour madame. Ça fera dix mille Ariary pour la course.", "malagasy": "Manao ahoana ramatoa. Arivo sy iray alina Ariary ny fitambarany.", "audio_id": "d3_2"},
            {"speaker": "A", "french": "C'est un peu cher. Pouvez-vous faire huit mille Ariary ?", "malagasy": "Mavesatra kely izany. Afaka alaina valo arivo Ariary ve ?", "audio_id": "d3_3"},
            {"speaker": "B", "french": "D'accord pour huit mille cinq cents Ariary, montez madame !", "malagasy": "Eny ary, valo arivo sy dimanjato Ariary, mandehana miditra ramatoa !", "audio_id": "d3_4"},
            {"speaker": "A", "french": "Merci beaucoup. Est-ce qu'il y a des embouteillages ?", "malagasy": "Misaotra betsaka. Misy fitohian-dalana ve izao ?", "audio_id": "d3_5"},
            {"speaker": "B", "french": "Un peu vers Analakely, mais nous allons prendre un raccourci.", "malagasy": "Misy kely eny Analakely, fa haka lalan-kely haingana kokoa isika.", "audio_id": "d3_6"}
        ]
    },
    {
        "id": "d4",
        "level": "A1",
        "category": "children",
        "title": "Ao amin'ny dokotera (Chez le médecin)",
        "situation": "Zazavavy kely sy ny dokotera lehilahy mandritra ny fizahana fahasalamana.",
        "roles": {
            "A": "Petite fille (Zazavavy kely)",
            "B": "Médecin (Dokotera lehilahy)"
        },
        "voices": {
            "A": {"type": "child_girl", "gender": "female", "age": "child", "label": "Fille 👧 (Enfant)", "avatar": "👧"},
            "B": {"type": "male", "gender": "male", "age": "adult", "label": "Homme 👨 (Médecin)", "avatar": "👨"}
        },
        "lines": [
            {"speaker": "B", "french": "Bonjour ma petite, qu'est-ce qui ne va pas aujourd'hui ?", "malagasy": "Manao ahoana ry zaza kely, inona no mahazo anao androany ?", "audio_id": "d4_1"},
            {"speaker": "A", "french": "Bonjour docteur, j'ai très mal à la gorge et j'ai de la fièvre.", "malagasy": "Manao ahoana dokotera, marary be ny tendroko ary mafana ny vatako.", "audio_id": "d4_2"},
            {"speaker": "B", "french": "Ouvre la bouche et dis 'Ah'. Depuis quand as-tu mal ?", "malagasy": "Sokafy ny vavanao ary teneno 'Ah'. Efa oviana no narary io ?", "audio_id": "d4_3"},
            {"speaker": "A", "french": "Depuis hier soir docteur. Je n'arrive pas à bien dormir.", "malagasy": "Hatrany omaly hariva dokotera. Tsy nahatafandry tsara aho.", "audio_id": "d4_4"},
            {"speaker": "B", "french": "Ne t'inquiète pas, c'est une petite angine. Je vais te donner du sirop très doux.", "malagasy": "Aza matahotra, angine kely fotsiny izany. Omeiko sirop mamy tsara ianao.", "audio_id": "d4_5"},
            {"speaker": "A", "french": "Merci beaucoup docteur ! Au revoir.", "malagasy": "Misaotra betsaka dokotera ! Veloma.", "audio_id": "d4_6"}
        ]
    },
    {
        "id": "d5",
        "level": "A1",
        "category": "adults",
        "title": "Ao amin'ny restora (Au restaurant)",
        "situation": "Mpanjifa lehilahy sy ny mpanolotra vehivavy ao amin'ny restora.",
        "roles": {
            "A": "Client (Mpanjifa lehilahy)",
            "B": "Serveuse (Vehivavy mpanolotra)"
        },
        "voices": {
            "A": {"type": "male", "gender": "male", "age": "adult", "label": "Homme 👨 (Client)", "avatar": "👨"},
            "B": {"type": "female", "gender": "female", "age": "adult", "label": "Femme 👩 (Serveuse)", "avatar": "👩"}
        },
        "lines": [
            {"speaker": "B", "french": "Bonjour monsieur, voici le menu. Avez-vous choisi ?", "malagasy": "Manao ahoana tompoko, indro ny lisitry ny sakafo. Efa nifidy ve ianao ?", "audio_id": "d5_1"},
            {"speaker": "A", "french": "Bonjour mademoiselle. Je voudrais un poulet au coco avec du riz.", "malagasy": "Manao ahoana tompokovavy. Haka akoho sy voanio ampiarahana amin'ny vary aho.", "audio_id": "d5_2"},
            {"speaker": "B", "french": "Excellente décision ! Et comme boisson, que souhaitez-vous ?", "malagasy": "Safidy tsara dia tsara ! Ary inona no zava-pisotro tianao ?", "audio_id": "d5_3"},
            {"speaker": "A", "french": "Une bouteille d'eau minérale bien fraîche s'il vous plaît.", "malagasy": "Tavoahangy rano mineraly mangatsiatsiaka tsara azafady.", "audio_id": "d5_4"},
            {"speaker": "B", "french": "Très bien monsieur, c'est noté. Votre plat sera servi dans dix minutes.", "malagasy": "Eny ary tompoko, voasoratra izany. Ho tonga ao anatin'ny folo minitra ny sakafonao.", "audio_id": "d5_5"},
            {"speaker": "A", "french": "Merci beaucoup mademoiselle.", "malagasy": "Misaotra betsaka tompokovavy.", "audio_id": "d5_6"}
        ]
    },
    {
        "id": "d6",
        "level": "A1",
        "category": "children",
        "title": "Manontany lalana (Demander son chemin)",
        "situation": "Zazavavy kely manontany lalana amin'ny lehilahy mponina an-toerana.",
        "roles": {
            "A": "Petite fille écolière (Zazavavy kely)",
            "B": "Habitant (Lehilahy mponina)"
        },
        "voices": {
            "A": {"type": "child_girl", "gender": "female", "age": "child", "label": "Fille 👧 (Écolière)", "avatar": "👧"},
            "B": {"type": "male", "gender": "male", "age": "adult", "label": "Homme 👨 (Habitant)", "avatar": "👨"}
        },
        "lines": [
            {"speaker": "A", "french": "Pardon monsieur, est-ce que vous savez où se trouve la Poste Centrale ?", "malagasy": "Azafady tompoko, fantatrao ve hoe aiza no misy ny La Poste Centrale ?", "audio_id": "d6_1"},
            {"speaker": "B", "french": "Oui ma petite fille. Tu continues tout droit, puis tu tournes à gauche au feu rouge.", "malagasy": "Eny ry zaza kely. Mandehana mahitsy hatrany, avy eo mivily miankavia eo amin'ny jiro mena.", "audio_id": "d6_2"},
            {"speaker": "A", "french": "Est-ce que c'est loin d'ici ?", "malagasy": "Lavitra be avy eto ve izany ?", "audio_id": "d6_3"},
            {"speaker": "B", "french": "Non pas du tout, c'est à seulement cinq minutes à pied.", "malagasy": "Tsy lavitra mihitsy, folo minitra an-tongotra fotsiny.", "audio_id": "d6_4"},
            {"speaker": "A", "french": "D'accord ! Merci beaucoup monsieur pour votre aide.", "malagasy": "Eny ary ! Misaotra betsaka tompoko amin'ny fanampiana.", "audio_id": "d6_5"},
            {"speaker": "B", "french": "De rien mon enfant, bonne journée !", "malagasy": "Tsy misy fisaorana ry anaka, mazotoa amin'ny andronao !", "audio_id": "d6_6"}
        ]
    },
    {
        "id": "d7",
        "level": "A1",
        "category": "adults",
        "title": "Ao amin'ny banky (À la banque)",
        "situation": "Vehivavy mpanjifa sy ny lehilahy guichetier ao amin'ny banky.",
        "roles": {
            "A": "Cliente (Vehivavy mpanjifa)",
            "B": "Guichetier (Lehilahy mpiasa)"
        },
        "voices": {
            "A": {"type": "female", "gender": "female", "age": "adult", "label": "Femme 👩 (Cliente)", "avatar": "👩"},
            "B": {"type": "male", "gender": "male", "age": "adult", "label": "Homme 👨 (Guichetier)", "avatar": "👨"}
        },
        "lines": [
            {"speaker": "B", "french": "Bonjour madame, que puis-je faire pour vous aujourd'hui ?", "malagasy": "Manao ahoana ramatoa, inona no azoko ampiana anao androany ?", "audio_id": "d7_1"},
            {"speaker": "A", "french": "Bonjour monsieur, je voudrais ouvrir un compte d'épargne.", "malagasy": "Manao ahoana tompoko, te hanokatra kaonty fitsitsiana aho.", "audio_id": "d7_2"},
            {"speaker": "B", "french": "Très bien. Avez-vous votre carte d'identité et un justificatif de domicile ?", "malagasy": "Tena tsara. Misy karapanondro sy taratasy fanamarinana toerana ve any aminao ?", "audio_id": "d7_3"},
            {"speaker": "A", "french": "Oui, j'ai apporté tous mes documents originaux et des copies.", "malagasy": "Eny, nentiko avokoa ny taratasy fototra sy ny dika mitovy aminy.", "audio_id": "d7_4"},
            {"speaker": "B", "french": "Parfait, remplissez ce formulaire et signez au bas de la page.", "malagasy": "Tena tsara, fenoy ity takelaka ity ary soniavo eo ambany indrindra.", "audio_id": "d7_5"},
            {"speaker": "A", "french": "Voilà monsieur, c'est fait. Merci pour vos explications claires.", "malagasy": "Indro tompoko, efa vita. Misaotra amin'ny fanazavana mazava.", "audio_id": "d7_6"}
        ]
    },
    {
        "id": "d8",
        "level": "A1",
        "category": "adults",
        "title": "Ny laha-dinika momba ny tetikasa (Réunion de travail)",
        "situation": "Vehivavy cheffe de projet sy ny lehilahy mpiara-miasa aminy.",
        "roles": {
            "A": "Cheffe de projet (Vehivavy mpitantana)",
            "B": "Collaborateur (Lehilahy mpiara-miasa)"
        },
        "voices": {
            "A": {"type": "female", "gender": "female", "age": "adult", "label": "Femme 👩 (Cheffe)", "avatar": "👩"},
            "B": {"type": "male", "gender": "male", "age": "adult", "label": "Homme 👨 (Collaborateur)", "avatar": "👨"}
        },
        "lines": [
            {"speaker": "A", "french": "Bonjour à tous. Aujourd'hui nous allons valider le planning de notre nouveau projet.", "malagasy": "Manao ahoana ny rehetra. Androany isika dia hanamarina ny fandaharam-potoana tetikasa vaovao.", "audio_id": "d8_1"},
            {"speaker": "B", "french": "Bonjour madame. J'ai préparé le rapport financier pour la première phase.", "malagasy": "Manao ahoana tompokovavy. Efa nomaniko ny tatitra ara-bola amin'ny dingana voalohany.", "audio_id": "d8_2"},
            {"speaker": "A", "french": "Excellent travail ! Est-ce que les délais prévus sont réalistes ?", "malagasy": "Asa tsara dia tsara ! Azo tanterahina ao anatin'ny fotoana voatondro ve ny rehetra ?", "audio_id": "d8_3"},
            {"speaker": "B", "french": "Oui tout à fait, avec l'équipe mobilisée nous serons prêts à temps.", "malagasy": "Eny mihitsy, miaraka amin'ny mpiara-miasa mazoto dia ho vonona amin'ny fotoana isika.", "audio_id": "d8_4"},
            {"speaker": "A", "french": "Parfait. Merci pour votre professionnalisme et votre engagement.", "malagasy": "Tsara indrindra. Misaotra amin'ny fahaiza-manao sy ny fahavitan-tena.", "audio_id": "d8_5"}
        ]
    },
    {
        "id": "d9",
        "level": "A1",
        "category": "children",
        "title": "Ao amin'ny hotely (À l'hôtel)",
        "situation": "Zazalahy kely mandeha vakansy sy ny vehivavy mpandray vahiny ao amin'ny hotely.",
        "roles": {
            "A": "Petit garçon (Zazalahy kely)",
            "B": "Réceptionniste (Vehivavy mpandray vahiny)"
        },
        "voices": {
            "A": {"type": "child_boy", "gender": "male", "age": "child", "label": "Garçon 👦 (Enfant)", "avatar": "👦"},
            "B": {"type": "female", "gender": "female", "age": "adult", "label": "Femme 👩 (Réceptionniste)", "avatar": "👩"}
        },
        "lines": [
            {"speaker": "B", "french": "Bonjour et bienvenue à l'Hôtel de la Ville ! Comment puis-je vous aider ?", "malagasy": "Manao ahoana ary tonga soa eto amin'ny Hôtel de la Ville ! Inona no azoko ampiana anareo ?", "audio_id": "d9_1"},
            {"speaker": "A", "french": "Bonjour madame, mes parents ont réservé une chambre familiale avec piscine.", "malagasy": "Manao ahoana ramatoa, ny ray aman-dreniko nanao famandrihana efitrano misy piscine.", "audio_id": "d9_2"},
            {"speaker": "B", "french": "Ah oui ! C'est la chambre numéro deux cent quatre au deuxième étage.", "malagasy": "Ah eny ! Ny efitrano laharana roanjato sy efatra eo amin'ny rihana faharoa izany.", "audio_id": "d9_3"},
            {"speaker": "A", "french": "Super ! Est-ce que le petit-déjeuner est inclus le matin ?", "malagasy": "Maha-finaritra ! Maimaimpoana ve ny sakafo maraina ?", "audio_id": "d9_4"},
            {"speaker": "B", "french": "Oui mon grand, servi de sept heures à dix heures au restaurant.", "malagasy": "Eny ry zaza kely, aroso amin'ny fito ora hatramin'ny folo ora ao amin'ny restora.", "audio_id": "d9_5"},
            {"speaker": "A", "french": "Merci beaucoup madame ! Je vais vite voir la piscine !", "malagasy": "Misaotra betsaka ramatoa ! Hihazakazaka hijery ny piscine aho !", "audio_id": "d9_6"}
        ]
    },
    {
        "id": "d10",
        "level": "A1",
        "category": "adults",
        "title": "Amin'ny fiantsonana taksibe (Gare routière)",
        "situation": "Vehivavy mpandeha sy ny lehilahy guichetier fiara taksibe.",
        "roles": {
            "A": "Voyageuse (Vehivavy mpandeha)",
            "B": "Guichetier (Lehilahy mpanangona)"
        },
        "voices": {
            "A": {"type": "female", "gender": "female", "age": "adult", "label": "Femme 👩 (Voyageuse)", "avatar": "👩"},
            "B": {"type": "male", "gender": "male", "age": "adult", "label": "Homme 👨 (Guichetier)", "avatar": "👨"}
        },
        "lines": [
            {"speaker": "A", "french": "Bonjour, je voudrais acheter un billet pour Antsirabe pour demain matin.", "malagasy": "Manao ahoana, te hividy tapakila mankany Antsirabe ho an'ny ampitso maraina aho.", "audio_id": "d10_1"},
            {"speaker": "B", "french": "Bonjour madame. Le départ est fixé à sept heures précises.", "malagasy": "Manao ahoana ramatoa. Amin'ny fito ora marina ny fidaingana.", "audio_id": "d10_2"},
            {"speaker": "A", "french": "C'est parfait. Combien coûte une place côté fenêtre ?", "malagasy": "Tena tsara. Ohatrinona ny toerana eo an-drihana varavarankely ?", "audio_id": "d10_3"},
            {"speaker": "B", "french": "C'est quinze mille Ariary madame. Voici votre reçu et votre numéro de siège.", "malagasy": "Arivo sy dimy alina Ariary ramatoa. Indro ny rosia sy ny laharan'ny seza.", "audio_id": "d10_4"},
            {"speaker": "A", "french": "Merci monsieur. À quelle heure doit-on être présent ?", "malagasy": "Misaotra tompoko. Amin'ny firy ora no tokony ho tonga eto ?", "audio_id": "d10_5"},
            {"speaker": "B", "french": "Soyez présente trente minutes avant le départ pour les bagages.", "malagasy": "Tonga eto telopolo minitra mialoha ny fidaingana mba handaminana ny entana.", "audio_id": "d10_6"}
        ]
    },
    {
        "id": "d11",
        "level": "A1",
        "category": "adults",
        "title": "Ao amin'ny farmasia (À la pharmacie)",
        "situation": "Vehivavy mpanjifa sy ny lehilahy pharmacien.",
        "roles": {
            "A": "Mère de famille (Vehivavy mpanjifa)",
            "B": "Pharmacien (Lehilahy mpanome fanafody)"
        },
        "voices": {
            "A": {"type": "female", "gender": "female", "age": "adult", "label": "Femme 👩 (Mère)", "avatar": "👩"},
            "B": {"type": "male", "gender": "male", "age": "adult", "label": "Homme 👨 (Pharmacien)", "avatar": "👨"}
        },
        "lines": [
            {"speaker": "B", "french": "Bonjour madame, que souhaitez-vous aujourd'hui ?", "malagasy": "Manao ahoana ramatoa, inona no ilainao androany ?", "audio_id": "d11_1"},
            {"speaker": "A", "french": "Bonjour monsieur, mon fils a de la toux et le nez qui coule.", "malagasy": "Manao ahoana tompoko, mikohaka sy mandeha lelo ny zanako lahy.", "audio_id": "d11_2"},
            {"speaker": "B", "french": "Quel âge a votre enfant madame ?", "malagasy": "Firiana taona ny zanakao ramatoa ?", "audio_id": "d11_3"},
            {"speaker": "A", "french": "Il a sept ans monsieur.", "malagasy": "Fito taona izy tompoko.", "audio_id": "d11_4"},
            {"speaker": "B", "french": "Voici un sirop pour la toux et de la vitamine C. Donnez-lui une cuillère matin et soir.", "malagasy": "Indro ny sirop kohaka sy vitamine C. Omeo iray sotro maraina sy hariva izy.", "audio_id": "d11_5"},
            {"speaker": "A", "french": "D'accord monsieur. Merci beaucoup pour vos conseils.", "malagasy": "Eny ary tompoko. Misaotra betsaka amin'ny torohevitra.", "audio_id": "d11_6"}
        ]
    },
    {
        "id": "d12",
        "level": "A1",
        "category": "children",
        "title": "Ao amin'ny sekoly (Vie scolaire & Inscription)",
        "situation": "Zazalahy écolier kely sy ny vehivavy secrétaire d'école.",
        "roles": {
            "A": "Zazalahy écolier (Petit garçon)",
            "B": "Secrétaire d'école (Vehivavy secrétaire)"
        },
        "voices": {
            "A": {"type": "child_boy", "gender": "male", "age": "child", "label": "Garçon 👦 (Écolier)", "avatar": "👦"},
            "B": {"type": "female", "gender": "female", "age": "adult", "label": "Femme 👩 (Secrétaire)", "avatar": "👩"}
        },
        "lines": [
            {"speaker": "A", "french": "Bonjour madame, je voudrais m'inscrire au club de football de l'école.", "malagasy": "Manao ahoana ramatoa, te hiditra amin'ny club de football amin'ny sekoly aho.", "audio_id": "d12_1"},
            {"speaker": "B", "french": "Bonjour mon petit ! Comment tu t'appelles et dans quelle classe es-tu ?", "malagasy": "Manao ahoana ry zaza kely ! Iza no anaranao ary amin'ny kilasy firy ianao ?", "audio_id": "d12_2"},
            {"speaker": "A", "french": "Je m'appelle Toky et je suis en classe de CM2.", "malagasy": "Toky no anarako ary ao amin'ny kilasy CM2 aho.", "audio_id": "d12_3"},
            {"speaker": "B", "french": "Très bien Toky ! Les entraînements ont lieu le mercredi après-midi.", "malagasy": "Tena tsara Toky ! Ny fampiofanana dia alarobia hariva no anaovana azy.", "audio_id": "d12_4"},
            {"speaker": "A", "french": "Génial ! Je vais apporter mon certificat médical demain.", "malagasy": "Tsara be ! Hitondra ny taratasy fanamarinana fahasalamana ampitso aho.", "audio_id": "d12_5"},
            {"speaker": "B", "french": "Bravo Toky, tu es inscrit ! À mercredi !", "malagasy": "Misaotra Toky, voasoratra ianao ! Mampino amin'ny alarobia !", "audio_id": "d12_6"}
        ]
    },
    {
        "id": "d13",
        "level": "A1",
        "category": "adults",
        "title": "Service client mobile (Masoivoho finday)",
        "situation": "Lehilahy mpanjifa sy ny vehivavy conseillère clientèle.",
        "roles": {
            "A": "Client (Lehilahy mpanjifa)",
            "B": "Conseillère (Vehivavy conseillère)"
        },
        "voices": {
            "A": {"type": "male", "gender": "male", "age": "adult", "label": "Homme 👨 (Client)", "avatar": "👨"},
            "B": {"type": "female", "gender": "female", "age": "adult", "label": "Femme 👩 (Conseillère)", "avatar": "👩"}
        },
        "lines": [
            {"speaker": "B", "french": "Bonjour monsieur ! Comment puis-je vous assister aujourd'hui ?", "malagasy": "Manao ahoana tompoko ! Inona no azoko ampiana anao androany ?", "audio_id": "d13_1"},
            {"speaker": "A", "french": "Bonjour mademoiselle, ma puce SIM ne capte plus le réseau 4G.", "malagasy": "Manao ahoana tompokovavy, tsy mandray réseau 4G intsony ny puce SIM-ko.", "audio_id": "d13_2"},
            {"speaker": "B", "french": "Donnez-moi votre numéro de téléphone pour vérifier votre compte.", "malagasy": "Omeo amiko ny laharan'ny findainao mba hizahako ny kaontinao.", "audio_id": "d13_3"},
            {"speaker": "A", "french": "C'est le zéro trois quatre, douze, trois cent quarante-cinq, six cent soixante-dix-huit.", "malagasy": "Zéro trois quatre, douze, trois cent quarante-cinq, six cent soixante-dix-huit izany.", "audio_id": "d13_4"},
            {"speaker": "B", "french": "J'ai réinitialisé vos paramètres réseau. Redémarrez votre téléphone maintenant.", "malagasy": "Efa naveriko amin'ny laoniny ny zava-drehetra. Avereno velomina ny findainao izao.", "audio_id": "d13_5"},
            {"speaker": "A", "french": "Ça fonctionne parfaitement ! Merci beaucoup mademoiselle.", "malagasy": "Mandeha tsara mihitsy izao ! Misaotra betsaka tompokovavy.", "audio_id": "d13_6"}
        ]
    },
    {
        "id": "d14",
        "level": "A1",
        "category": "children",
        "title": "Sporo sy fialamboly (Loisirs & Jeux d'enfants)",
        "situation": "Zazavavy kely sy zazalahy kely miresaka momba ny lalao am-povoantany.",
        "roles": {
            "A": "Soafara (Petite fille)",
            "B": "Koto (Petit garçon)"
        },
        "voices": {
            "A": {"type": "child_girl", "gender": "female", "age": "child", "label": "Fille 👧 (Soafara)", "avatar": "👧"},
            "B": {"type": "child_boy", "gender": "male", "age": "child", "label": "Garçon 👦 (Koto)", "avatar": "👦"}
        },
        "lines": [
            {"speaker": "A", "french": "Salut Koto ! Est-ce que tu es libre cet après-midi pour jouer au ballon ?", "malagasy": "Salama Koto ! Afaka ve ianao amin'ity hariva ity hilalao baolina ?", "audio_id": "d14_1"},
            {"speaker": "B", "french": "Salut Soafara ! Oui, je termine mes devoirs et j'arrive au terrain !", "malagasy": "Salama Soafara ! Eny, mamono ny fehezanteny aho dia tonga eny amin'ny kianja !", "audio_id": "d14_2"},
            {"speaker": "A", "french": "Génial ! On va faire une équipe avec nos camarades de classe.", "malagasy": "Tsara be ! Hanao ekipa miaraka amin'ny namana ao an-kilasy isika.", "audio_id": "d14_3"},
            {"speaker": "B", "french": "D'accord ! Apporte le grand ballon rouge s'il te plaît !", "malagasy": "Eny ary ! Ento ilay baolina mena lehibe azafady !", "audio_id": "d14_4"},
            {"speaker": "A", "french": "Pas de problème Koto, à tout à l'heure !", "malagasy": "Tsy misy olana Koto, mandrapiha eo !", "audio_id": "d14_5"},
            {"speaker": "B", "french": "À tout à l'heure Soafara !", "malagasy": "Mandrapiha Soafara !", "audio_id": "d14_6"}
        ]
    },
    {
        "id": "d15",
        "level": "A1",
        "category": "children",
        "title": "Ny anjarantsika ao an-trano (Les devoirs à la maison)",
        "situation": "Neny mikarakara ny fizahan-pampianarana miaraka amin'ny zanany lahy kely.",
        "roles": {
            "A": "Maman (Neny - Mère)",
            "B": "Rova (Petit garçon)"
        },
        "voices": {
            "A": {"type": "female", "gender": "female", "age": "adult", "label": "Femme 👩 (Maman)", "avatar": "👩"},
            "B": {"type": "child_boy", "gender": "male", "age": "child", "label": "Garçon 👦 (Rova)", "avatar": "👦"}
        },
        "lines": [
            {"speaker": "A", "french": "Rova mon chéri, est-ce que tu as terminé tes devoirs de français ?", "malagasy": "Rova anaka, efa vitanao ve ny fampianarana teny frantsay ?", "audio_id": "d15_1"},
            {"speaker": "B", "french": "J'ai presque fini maman ! Il me reste juste la poésie à apprendre.", "malagasy": "Efa ho vita neny ! Ny tononkalo sisa no tokony hianarana.", "audio_id": "d15_2"},
            {"speaker": "A", "french": "Répète la première strophe pour moi, je t'écoute.", "malagasy": "Avereno ny andininy voalohany mba hinhainako anao.", "audio_id": "d15_3"},
            {"speaker": "B", "french": "Bonjour les oiseaux, bonjour le soleil brillant du matin !", "malagasy": "Manao ahoana ry vorona, manao ahoana ny masoandro mamirapiratra maraina !", "audio_id": "d15_4"},
            {"speaker": "A", "french": "Bravo mon fils ! Ta prononciation est excellente.", "malagasy": "Misaotra anaka ! Tena tsara dia tsara ny fitenenanao.", "audio_id": "d15_5"},
            {"speaker": "B", "french": "Merci maman ! Je peux aller jouer maintenant ?", "malagasy": "Misaotra neny ! Afaka mandeha hilalao amin'izay ve aho ?", "audio_id": "d15_6"}
        ]
    },
    {
        "id": "d16",
        "level": "A1",
        "category": "children",
        "title": "Lalao ao an-jaridaina (Au parc de jeux)",
        "situation": "Zazavavy kely Miora sy zazalahy kely Tahina milalao ao an-jaridaina.",
        "roles": {
            "A": "Miora (Petite fille)",
            "B": "Tahina (Petit garçon)"
        },
        "voices": {
            "A": {"type": "child_girl", "gender": "female", "age": "child", "label": "Fille 👧 (Miora)", "avatar": "👧"},
            "B": {"type": "child_boy", "gender": "male", "age": "child", "label": "Garçon 👦 (Tahina)", "avatar": "👦"}
        },
        "lines": [
            {"speaker": "A", "french": "Regarde Tahina ! La balançoire verte est libre !", "malagasy": "Jereo Tahina ! Malalaka ilay fizarazara maitso !", "audio_id": "d16_1"},
            {"speaker": "B", "french": "Super Miora ! Pousse-moi un petit peu s'il te plaît !", "malagasy": "Tsara Miora ! Atosio kely aho azafady !", "audio_id": "d16_2"},
            {"speaker": "A", "french": "Un, deux, trois... C'est parti ! Tu voles très haut !", "malagasy": "Iray, roa, telo... Lasa izany ! Manidina ambony be ianao !", "audio_id": "d16_3"},
            {"speaker": "B", "french": "Merci Miora ! À ton tour maintenant, viens monter !", "malagasy": "Misaotra Miora ! Anjaranao amin'izay, avia miakatra !", "audio_id": "d16_4"},
            {"speaker": "A", "french": "C'est amusant ! Le soleil brille et le ciel est bleu.", "malagasy": "Mahafinaritra be ! Miposaka ny masoandro ary manga ny lanitra.", "audio_id": "d16_5"},
            {"speaker": "B", "french": "Oui, c'est une très belle journée au parc !", "malagasy": "Eny, andro mahafinaritra kanto ao amin'ny jaridaina !", "audio_id": "d16_6"}
        ]
    }
]

data["dialogues"] = dialogues

with open("src/languages/fr.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Successfully updated fr.json with 16 dialogues with gender/age voice configurations!")
