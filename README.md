#Cat Meow Classifier

1. Dataset—
>>>Original Dataset is from:https://www.kaggle.com/datasets/andrewmvd/cat-meow-classification?resource=download&select=dataset
440 audio recordings belonging to 3 classes
  • B = brushing; 
	•	F = waiting for food; 
	•	I =  isolation in an unfamiliar environment)

>>> July25 Added Dataset :
    80 From 50 Environment Database:https://github.com/karolpiczak/ESC-50
       • E = Environment Sound
    68 From Youtube video
	     •	H = Hising Threatened
	     •	G = Growl Angry
      	     •	S = Super satisfied

2. Features
Naming convention for files -> C_NNNNN_BB_SS_OOOOO_RXX, where:
C = emission context (values: B = brushing; F = waiting for food; I: isolation in an unfamiliar environment); NNNNN = cat’s unique ID; BB = breed (values: MC = Maine Coon; EU: European Shorthair); SS = sex (values: FI = female, intact; FN: female, neutered; MI: male, intact; MN: male, neutered); OOOOO = cat owner’s unique ID; R = recording session (values: 1, 2 or 3) XX = vocalization counter (values: 01..99)

3. Model:
   Trained by Tensorflow. Accuracy: 0.8175 (July 25)


**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

