// Importando a base de dados do Fórum Colcic
const database = require('./result.json');

// Importando a biblioteca 'lda' para encontrar as palavras chaves
// Para saber mais sobre a biblioteca: https://www.npmjs.com/package/lda
// Para saber mais sobre Latent Dirichlet allocation (LDA): 
// http://en.wikipedia.org/wiki/Latent_Dirichlet_allocation
// https://www.jmlr.org/papers/volume3/blei03a/blei03a.pdf
// https://towardsdatascience.com/nlp-extracting-the-main-topics-from-your-dataset-using-lda-in-minutes-21486f5aa925
const lda = require("lda");

// Importando a biblioteca responsável pela escrita e leitura em arquivos
const filesystem = require('fs');

// Vetor com palavras-chaves para identificar mensagens relacionadas
const searchInMessages = ["?", "dúvida", "Dúvida", "dúvidas", "Dúvidas", "duvida", "Duvida",
                          "Como", "como", "Porque", "porque", "Por que", "por que",
                          "pergunta",  "Pergunta", "perguntas", "Perguntas",
                          "data", "Data", "datas", "Datas", "assunto",
                          "Assunto", "assuntos", "Assuntos"];

// const newDatabase = database.messages.filter(data => data.text.includes('?'));
// Quantidade de mensagens no Fórum COLCIC JSON
// console.log(`Quantidade de Mensagens: ${database.messages.length}`);

// Selecionando mensagens que contém as palavras chaves do vetor, como dúvidas
const databaseQuestions = database.messages.filter(data => searchInMessages.some(question => data.text.includes(question))); 

// Selecionando mensagens respostas das perguntas acima
const databaseResponseQuestions = database.messages.filter(data => databaseQuestions.some(question => question.id === data.reply_to_message_id));

// Juntando os dois objetos em um só
let newDatabase = databaseQuestions.concat(databaseResponseQuestions);

// Ordenando o objeto pelo id 
newDatabase.sort((a, b) => a.id - b.id);

// Criando uma nova estrutura
let perguntasRespostas = new Array();

// Contador de perguntas com respostas
let countQuestionsAnswers = 0;

// Verificando todos os dados da base para estrutura como perguntas e respostas, sem o nome dos usuários
newDatabase.forEach(data => {
    // Filtrando para verificar se existe alguma resposta para a pergunta realizada
    let resultSearch = newDatabase.filter(dataInDB => dataInDB.reply_to_message_id === data.id);
    
    // Verificando se foi encontrado alguma resposta
    if(resultSearch.length > 0) {
        // console.log("resultSearch", resultSearch);

        // Criando um laço de repetição para adicionar todas as respostas encontradas para a pergunta
        resultSearch.forEach(response => {
            // Verificando se a resposta é diferente de vazia
            if(response.text !== "") {
                // Incrementando a quantidade de perguntas e respostas encontrada
                countQuestionsAnswers++;
    
                // Adicionando tudo o que foi encontrado a uma estrutura de dados
                let structObjectQuestionResponse = {
                    id: countQuestionsAnswers,
                    question: data.text,
                    answer: response.text
                };

                perguntasRespostas.push(structObjectQuestionResponse);
            }
        }) 

    }
});

// Removendo dados duplicados
perguntasRespostas = perguntasRespostas.filter((structQuestionAnswer, index, array) => 
    // Caso encontre um elemento na mesma posição do array, retorna, (true)
    // senão, ele identifica como duplicado e, então, ignora (false)
    index === array.findIndex((currentValue) => (
        currentValue.question === structQuestionAnswer.question && currentValue.answer === structQuestionAnswer.answer 
    ))
);

// console.log("newDatabase", newDatabase);

// Gravando em um arquivo json as informações das perguntas e respostas 
// filesystem.writeFile('./newResult.json', JSON.stringify(newDatabase, null, 2), 'utf-8', (err) => {
//     if(err) return console.error(err);
//     console.log("New Database > newResult.json");
// });

// Criando um novo arquivo para gravar as perguntas com as respostas de uma forma estruturada e organizada
filesystem.writeFile('./databaseQuestionsAnswers.json', JSON.stringify(perguntasRespostas, null, 2), 'utf-8', (err) => {
    if(err) return console.error(err);
    console.log("New Database > databaseQuestionsAnswers.json");
});

// Tentativa: Encontrar palavras-chaves
// Criando um array apenas com as perguntas encontradas
let questionsOnly = perguntasRespostas.map(struct => {
    return struct.question;
});

// Limpando o array de perguntas
questionsOnly = questionsOnly.filter((question) => typeof question === 'string');
// console.log("Questions", questionsOnly[269]);

// Transformando em texto o array de perguntas
let arrayQuestionsOnly = "" + questionsOnly.map(question => `${question}, `);
// console.log("arrayQuestionsOnly", arrayQuestionsOnly);

// Extraindo frases do texto
var documents = arrayQuestionsOnly.match( /[^\.!\?]+[\.!\?]+/g );

// console.log("documents", documents);

// Executar o LDA e pegar termos de x tópicos (y termos de cada)
let resultLDA = lda(documents, 10, 20, ['pt']);

// console.log("Quantidade de Perguntas: ", questionsOnly.length);
// console.log("resultLDA", resultLDA);

// Criando variáveis para armazenar os resultados de acordo com a pontuação
// da probabilidade obtida através do LDA algorithm
let highResult = [];
let middleResult = [];
let lowResult = [];

// Percorrendo o resultado do LDA algorithm para obter e armazenar os resultados
resultLDA.forEach(resultLDA => resultLDA.forEach(resultTopic => {
    if(resultTopic.probability >= 0.050 && resultTopic.probability <= 0.099) {
        highResult.push(resultTopic);
    } else if(resultTopic.probability >= 0.035 && resultTopic.probability <= 0.049) {
        middleResult.push(resultTopic);
    } else if(resultTopic.probability >= 0.010 && resultTopic.probability <= 0.034) {
        lowResult.push(resultTopic);
    }
}));

// Estruturando o JSON para depois armazenar em um arquivo 
let resultTopicsProbabilityLDA = [{
    "amountQuestions": questionsOnly.length,
    "highTopics": highResult,
    "middleTopics": middleResult,
    "lowTopics": lowResult
}];

// Criando uma nova estrutura para ter os tópicos, perguntas, respostas e probabilidadade
// em uma mesma estrutura para utilizar no chatbot
let newStructureQuestionsAnswersTopicsProbability = [];
let newId = 0;

// Percorrendo cada tópico e identificando as perguntas correspondentes com as suas respostas
resultTopicsProbabilityLDA.forEach(topicID => {
    // - High topic terms
    topicID.highTopics.forEach(topic => {  
        // Verificando se o termo existe na pergunta e tendo acesso a pergunta e resposta
        perguntasRespostas.forEach(questionAnswer => {
            if (questionAnswer.question.includes(topic.term) === true) { 
                newStructureQuestionsAnswersTopicsProbability.push({
                    id: newId,
                    topic: topic.term,  
                    question: questionAnswer.question, 
                    answer: questionAnswer.answer, 
                    probability: topic.probability
                });
                newId++;
            }    
        }); 
    });

    // - Middle topic terms
    topicID.middleTopics.forEach(topic => {  
        // Verificando se o termo existe na pergunta e tendo acesso a pergunta e resposta
        perguntasRespostas.forEach(questionAnswer => {
            if (questionAnswer.question.includes(topic.term) === true) { 
                newStructureQuestionsAnswersTopicsProbability.push({
                    id: newId,
                    topic: topic.term,  
                    question: questionAnswer.question, 
                    answer: questionAnswer.answer, 
                    probability: topic.probability
                });
                newId++;
            }    
        }); 
    });

    // - Middle topic terms
    topicID.lowTopics.forEach(topic => {  
        // Verificando se o termo existe na pergunta e tendo acesso a pergunta e resposta
        perguntasRespostas.forEach(questionAnswer => {
            if (questionAnswer.question.includes(topic.term) === true) { 
                newStructureQuestionsAnswersTopicsProbability.push({
                    id: newId,
                    topic: topic.term,  
                    question: questionAnswer.question, 
                    answer: questionAnswer.answer, 
                    probability: topic.probability
                });
                newId++;
            }    
        }); 
    });
});

// Visualizando o resultado 
// console.log("newStructureQuestionsAnswersTopicsProbability", newStructureQuestionsAnswersTopicsProbability);

// Armazenando em um arquivo JSON a nova estrutura
filesystem.writeFile('./databaseTopicsQuestionsAnswers.json', JSON.stringify(newStructureQuestionsAnswersTopicsProbability, null, 2), 'utf-8', (err) => {
    if(err) return console.error(err);
    console.log("New Database Questions Topics > databaseTopicsQuestionsAnswers.json");
});

// Armazenando em um arquivo JSON
// filesystem.writeFile('./databaseQuestionsTopics.json', JSON.stringify(resultTopicsProbabilityLDA, null, 2), 'utf-8', (err) => {
//     if(err) return console.error(err);
//     console.log("New Database Questions Topics > databaseQuestionsTopics.json");
// });



// Criando um array para contar a ocorrência de cada elemento
// let countOccurrencesWords = [];

// questionsOnly.forEach(question => {
//     // console.log("question", question);    
//     // Verificando se a pergunta pode ser utilizada, ou seja, 
//     // se for um objeto sem informações úteis, logo é descartado
//     if(typeof question !== 'object') {
//         // Separando a pergunta em um vetor de palavras
//         let arrayQuestionWords = typeof question !== 'array' ? question.split(" ") : question[0].split(" ");
//         // console.log("arrayQuestion: ", arrayQuestionWords);
        
//         // Criando um objeto com todas as palavras e a quantidade das mesmas
//         arrayQuestionWords.forEach((word) => {
//             countOccurrencesWords.push({ 'word' : word, 'amount' : 1}); 
//         }); 
//     }
// });

// Contar a quantidade de cada palavra e armazenar
// Eliminar qualquer palavra que seja menor que 3 letras
// Criar uma nova estrutura para as palavras chaves
// Criar uma nova estrutura para os dados {assunto: '', respostas: ''}
// console.log("Total: " + JSON.stringify(countOccurrencesWords));
