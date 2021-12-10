// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';
'esversion: 8';
const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');

// Vetor de vogais
const vowels = ['a', 'e', 'i', 'o', 'u', 'ã', 'á', 'é', 'í', 'ó', 'ú', 'â', 'ê', 'ô', 'à', 'ü'];

// Vetor de pontuações
const accentsPoints = ['!', '?', ',', '.', '@', 
                    '#', '$', '%', '¨', '&', 
                    '*', '(', ')', '-', '_', 
                    '+', '=', '¹', '²', '³', 
                    '{', '}', '[', ']', '<', 
                    '>', ':', ';', '/', '\\', 
                    'º', 'ª'];

const axios = require('axios');

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
  
  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  
  // Perguntas voltadas para a situação de MATRICULADO do aluno
  function questionsMatriculado() {
    agent.add('MATRICULADO'); 
    agent.add('Em que posso te ajudar?');
    agent.add(new Suggestion('Portal UESC'));
    agent.add(new Suggestion('Colegiado'));
    agent.add(new Suggestion('Disciplinas de CIC'));
    agent.add(new Suggestion('Fluxograma'));
  }
  
  // Perguntas voltadas para a situação de ABANDONO do aluno
  function questionsAbandono() {
    agent.add('ABANDONO'); 
    agent.add('Em que posso te ajudar?');
    agent.add(new Suggestion('Colegiado'));
  }
  
  // Perguntas voltadas para a situação de CANCELAMENTO do aluno
  function questionsCancelamento() {
    agent.add('CANCELAMENTO'); 
    agent.add('Em que posso te ajudar?');
    agent.add(new Suggestion('Colegiado'));
  }
  
  // Perguntas voltadas para a situação de MATRÍCULA INSTITUCIONAL do aluno
  function questionsMatriculaInstitucional() {
    agent.add('MATRICULA INSTITUCIONAL'); 
    agent.add('Em que posso te ajudar?');
    agent.add(new Suggestion('Colegiado'));
    agent.add(new Suggestion('Disciplinas de CIC'));
    agent.add(new Suggestion('Fluxograma'));
  }
  
  // Perguntas voltadas para a situação de TRANCAMENTO PARCIAL do aluno
  function questionsTrancamentoParcial() {
    // Informações sobre o Trancamento Parcial
    agent.add('TRANCAMENTO PARCIAL'); 
    agent.add('Em que posso te ajudar?');
    agent.add(new Suggestion('Colegiado'));
  }
  
  // Perguntas voltadas para a situação de TRANCAMENTO TOTAL do aluno
  function questionsTrancamentoTotal() {
    // Informações sobre o Trancamento Total
    agent.add('TRANCAMENTO TOTAL'); 
    agent.add('Em que posso te ajudar?');
    agent.add(new Suggestion('Colegiado'));
  }
  
  // Perguntas voltadas para a situação de FORMADO do aluno
  function questionsFormado() {
    // Informações sobre o FORMADO
    agent.add('FORMADO'); 
    agent.add('Em que posso te ajudar?');
    agent.add(new Suggestion('Colegiado'));
    agent.add(new Suggestion('Diploma'));
  }
  
  // Função para acessar e pegar as informações da base de dados através da API
  function getSpreadsheetData() {
  	return axios.get(`https://sheetdb.io/api/v1/lybswu5quzgit`);
  }
  
  // Acesso ao calendário de forma básica e com palavras-chaves diretas
  function calendario() {
    // Identificando qual o assunto foi digitado pelo usuário
    const subjectUser = agent.parameters.assunto.toLowerCase();
    
    // Criando um array de palavras da mensagem digitada do usuário
    const sentenceSubjectUser = subjectUser.split(" ");
    
  	return getSpreadsheetData().then(response => {
      	response.data.map(subject => {
        	//if(subject.Assunto == subjectUser) {
          	if(sentenceSubjectUser.includes(subject.Assunto.toLowerCase())) {
          		agent.add(`O período de ${subject.Assunto}: ${subject.Resposta}`);  
            }
        });
    });
  }
  
  async function searchInCalendar() {
  	// Identificando qual o assunto foi digitado pelo usuário
  	const sentenceSubjectUser = await discoverTheSubjectInSentence(agent.parameters.assunto);
  	// const sentenceSubjectUser = await discoverTheSubjectInSentence("Onde eu posso fazer o trancamento?");

    // console.log(`Sentence Subject User ${sentenceSubjectUser}`);

    // Obter dados de acordo com o resultado do assunto digitado pelo usuário
    return getSpreadsheetData().then(response => {
          response.data.map(subject => {
              if(sentenceSubjectUser === subject.Assunto) {
                  agent.add(`O período de ${subject.Assunto}: ${subject.Resposta}`);  
              }
          });
    });
}
  
  function identifyMatricula() {
    // Identificando o número de matrícula que o usuário digitou
  	const matriculaUser = agent.parameters.matricula;
    
    // Definindo o primeiro valor como falso antes de fazer a busca
    // na base de dados
    let foundMatricula = false;
    
    console.log(`MatriculaUser: ${matriculaUser}`);
    
  	return getSpreadsheetData().then(response => {
    	console.log("Response Data: ", response.data);
      	console.log("Matricula: ", matriculaUser);
      	response.data.map(subject => {
        	//if(subject.Assunto == subjectUser) {
          	if(matriculaUser.includes(subject.matricula)) {
              	if(subject.status === "Matriculado") {
					agent.add(`Olá ${subject.nome}!`); 
					agent.add(`Seu status atual é `);
                  	questionsMatriculado();
                } else if (subject.status === "Abandono") {
					agent.add(`Olá ${subject.nome}!`); 
					agent.add(`Seu status atual é `);
                  	questionsAbandono();
				} else if (subject.status === "Cancelamento") {
					agent.add(`Olá ${subject.nome}!`);
                  	agent.add(`Seu status atual é `);  
                  	questionsCancelamento();
				} else if (subject.status === "Matrícula Institucional") {
					agent.add(`Olá ${subject.nome}!`);
                  	agent.add(`Seu status atual é `);  
                  	questionsMatriculaInstitucional();
                } else if (subject.status === "Trancamento Parcial") {
                  	agent.add(`Olá ${subject.nome}!`);
                  	agent.add(`Seu status atual é `);
                  	questionsTrancamentoParcial();
				} else if (subject.status === "Trancamento Total") {
					agent.add(`Olá ${subject.nome}!`);
                  	agent.add(`Seu status atual é `);
                  	questionsTrancamentoTotal();
				} else if (subject.status === "Formado") {
                  	agent.add(`Olá ${subject.nome}!`); 
					agent.add(`Seu status atual é `);
                  	questionsFormado();
				}
          		
              	foundMatricula = true;
            } 
        });
      
      	if(!foundMatricula){	
          agent.add(`Não consegui identificar a matrícula ${matriculaUser}! Ou você não estuda na UESC ou foi digitado errado!`);
        }
      
      	
    });
  }
  
  // - Se o usuário digitar: "Eu quero saber quando vai começar a Matrícula", identificar e mostrar a resposta respectiva
async function discoverTheSubjectInSentence(sentence) {
  // Variável responsável, caso nada dos assuntos for encontrado
  let whatSubject = new Set();

  // Acessando a base de dados e recebendo o retorno das informações
  let getData = await getSpreadsheetData();
  
  // Pegando todos os assuntos da base de dados
  let subjectList = getData.data.map(subject => subject.Assunto);

  // Limpando a lista de strings vazias 
  subjectList = subjectList.filter(subject => subject !== "");

  // Inicializando o subjectWasFound (Assunto foi encontrado?)
  // Fazer uma busca para identificar,
  // se a palavra faz parte das palavras da base de dados
  sentence.split(" ").forEach((wordSentence) => {
    // console.log("TestWord", wordSentence);
    let subjectFound = identifyWordsRight(wordSentence, subjectList);
    // console.log("subjectFound", subjectFound);

    if (subjectFound) {
      // Adicionando se o assunto foi encontrado
      whatSubject.add(subjectFound);
    }
  });
  
  // console.log("whatSubject", whatSubject);

  // Verificando se o assunto foi encontrado na base de dados
  if (whatSubject.size > 0) {
    console.log(`O assunto questionado é sobre ${[...whatSubject].toString()}`);
  } else {
    console.log(
      "Desculpe, esse assunto não faz parte da minha diretriz! Por favor, entre em contato com o colegiado!"
    );
  }

  return [...whatSubject].toString();
}

  // - Desenvolver um algoritmo que identifique palavras escritas de forma errada e mostre o resultado correto
function identifyWordsRight(testWord, subjectList) {
  // console.log("Identify Words Right running ...");
  // Função para transformar palavra sem vogais
  let withoutVowels = (word) =>
    word
      .split("")
      .filter((letter) => vowels.includes(letter) === false)
      .join("");

  // Função para transformar palavra sem consoantes
  let withoutConsonants = (word) =>
    word
      .split("")
      .filter((letter) => vowels.includes(letter) === true)
      .join("");

  // Função para transformar palavra sem pontuações
  let withoutPontuation = (word) =>
    word
      .split("")
      .filter((letter) => accentsPoints.includes(letter) === false)
      .join("");

  // Função para transformar palavra sem acentos gramaticais
  let substituteAccent = (word) =>
    word.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Versão Aprimorada (3.0)
  let wordFoundAndRight = subjectList.map(subject => {
        let word = subject.split(" ")[0];
        let result = (word === testWord) || 
              (withoutPontuation(word) === testWord) || 
              (withoutVowels(word) === testWord) ||  
              (withoutConsonants(word) === testWord) || 
              (substituteAccent(word) === testWord) || 
              (word.toLowerCase() === testWord) ||
              // Verificando todas as possibilidades em letras minúsculas
              (withoutPontuation(word.toLowerCase()) === testWord) || 
              (withoutVowels(word.toLowerCase()) === testWord) ||  
              (withoutConsonants(word.toLowerCase()) === testWord) || 
              (substituteAccent(word.toLowerCase()) === testWord) ||
              // Verificando todas as possibilidades em letras maiúsculas
              (word.toUpperCase() === testWord) ||
              (withoutPontuation(word.toUpperCase()) === testWord) || 
              (withoutVowels(word.toUpperCase()) === testWord) ||  
              (withoutConsonants(word.toUpperCase()) === testWord) || 
              (substituteAccent(word.toUpperCase()) === testWord) ||
              // Verificando todas as possibilidades sem pontuação 
              (withoutPontuation(testWord) === word) || 
              (withoutPontuation(testWord.toLowerCase()) === word) || 
              (withoutPontuation(testWord.toUpperCase()) === word) || 
              (withoutPontuation(withoutVowels(testWord)) === word) || 
              (withoutPontuation(withoutConsonants(testWord)) === word) || 
              (withoutPontuation(substituteAccent(testWord)) === word) ||
              (withoutPontuation(testWord.toLowerCase()) === word.toLowerCase()) || 
              (withoutPontuation(testWord.toUpperCase()) === word.toUpperCase()) ? subject : false;

          if(result) {
            return subject;
          }
      }
    );
  // Retirando todos os resultados indefinidos
  wordFoundAndRight = wordFoundAndRight.filter(
    (status) => status !== undefined
  );
  // console.log("wordFoundAndRight", wordFoundAndRight);

  // Se algum resultado foi encontrado além do undefined
  if (wordFoundAndRight.length > 0) {
    // console.log("Algum resultado foi encontrado: ", wordFoundAndRight[0]);
    return wordFoundAndRight;
  }

  // Caso não encontrou o assunto correspondente, retorne false
  return false;
}

  //intentMap.set('Calendario', calendario);
  intentMap.set('Calendario', searchInCalendar);
  intentMap.set('Matricula', identifyMatricula);
  
  agent.handleRequest(intentMap);
});
