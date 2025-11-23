# ⚙️ Projeto Rube Goldberg: Estudos Digitais

Bem-vindo ao repositório do projeto **Rube Goldberg**. Esta é uma aplicação web interativa desenvolvida para revolucionar a forma como alunos interagem com estudos digitais, utilizando simulações físicas e lógica visual para tornar o aprendizado mais engajador.

## 🧐 O que é uma Máquina de Rube Goldberg?

Você já viu aqueles vídeos onde uma bolinha bate em um dominó, que liga um ventilador, que empurra um barco...? Isso é uma máquina de Rube Goldberg.

**Contexto Histórico:**
O termo vem do cartunista e engenheiro americano **Rube Goldberg (1883–1970)**. Ele ficou famoso por desenhar diagramas complexos de máquinas malucas que executavam tarefas extremamente simples (como limpar a boca com um guardanapo ou apontar um lápis) da maneira mais indireta e complicada possível.

**Neste Projeto:**
Utilizamos esse conceito de "reação em cadeia" não apenas como diversão, mas como uma metáfora visual para conectar pontos de conhecimento. O objetivo é ajudar o aluno a visualizar como um conceito leva ao outro, melhorando a fixação do conteúdo através da interatividade.

---

## 🚀 Tecnologias Utilizadas

Este projeto foi construído com ferramentas modernas de desenvolvimento web:

* **[Node.js](https://nodejs.org/)**: Ambiente de execução JavaScript.
* **[React](https://react.dev/)**: Biblioteca para construção de interfaces de usuário.
* **[TypeScript](https://www.typescriptlang.org/)**: JavaScript com superpoderes (tipagem estática) para maior segurança no código.
* **[Matter.js](https://brm.io/matter-js/)**: Motor de física 2D que permite as simulações de gravidade e colisão.
* **[Lucide React](https://lucide.dev/)**: Biblioteca de ícones leve e moderna.

---

## 📦 Guia de Instalação (Passo a Passo)

Se você nunca programou ou nunca rodou um projeto Node.js, siga os passos abaixo para fazer esta máquina funcionar no seu computador:

### 1. Instalar o Node.js
O Node.js é o "motor" que fará o projeto rodar.
1. Acesse o site oficial: [nodejs.org](https://nodejs.org).
2. Baixe a versão marcada como **LTS** (Recommended for most users).
3. Instale como um programa comum (vá clicando em "Next" até finalizar).
4. Para verificar se funcionou, abra seu terminal (Prompt de Comando ou PowerShell) e digite: `node -v`. Se aparecer um número, está tudo certo.

### 2. Baixar este projeto (Clonar)
Você precisa trazer os arquivos deste site para o seu computador.
1. Instale o **Git** [aqui](https://git-scm.com/downloads), caso não tenha.
2. Crie uma pasta no seu computador onde deseja guardar o projeto.
3. Clique com o botão direito na pasta e selecione "Git Bash Here" (ou abra o terminal na pasta).
4. Digite o comando abaixo:

```bash
git clone https://github.com/marceloroberto/rube-goldberg.git
```

### 3. Instalar as Dependências
Precisamos baixar as bibliotecas (Matter.js, React, etc.) que o projeto utiliza.

1. Entre na pasta do projeto pelo terminal:
```bash
cd rube-goldberg
```
2. Execute o comando de instalação:
```bash
npm install
```
*Aguarde alguns instantes enquanto o computador baixa tudo o que é necessário.*

### 4. Rodar o Projeto
Agora que tudo está instalado, vamos iniciar a aplicação.

1. No terminal, digite:
```bash
npm run dev
```
*(Caso o comando acima não funcione, tente `npm start`)*.

2. O terminal irá mostrar um endereço local, geralmente algo como `http://localhost:5173` ou `http://localhost:3000`.
3. Copie esse endereço e cole no seu navegador.

🎉 **Pronto! O projeto deve estar rodando.**

---

## 🤝 Contribuindo

Este é um projeto Open Source e contribuições são muito bem-vindas! Se você tem ideias para novas fases da máquina, melhorias na física ou novos recursos educacionais:

1. Faça um **Fork** do projeto.
2. Crie uma Branch para sua Feature (`git checkout -b feature/NovaFuncionalidade`).
3. Faça o Commit de suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`).
4. Faça o Push para a Branch (`git push origin feature/NovaFuncionalidade`).
5. Abra um **Pull Request**.

---

Desenvolvido por [Marcelo Roberto](https://github.com/marceloroberto) utilizando a IA Google Gemini.
