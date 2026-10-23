<?php
declare(strict_types=1);
namespace SecurityLab\Pages\Home;

use AML\Engine\Api;
use AML\View\{Page, State, Style, View};
use function AML\View\{Button, Form, Heading, HiddenInput, MainContent, Paragraph, PasswordInput, Text, TextField, VStack};

final class HomePage extends Page
{
    #[State] private string $message = 'Données fictives';
    #[State] private string $result = '';
    #[State] private string $error = '';

    public function body(): View
    {
        return MainContent(
            VStack(
                Heading('Laboratoire PHPAML'),
                Paragraph('Application locale de vérification. Toutes les données sont fictives.'),
                TextField('message', $this->message)->id('message'),
                Text($this->message)->id('mirror'),
                Button('Enregistrer')->onClick(Api::post('/api/save', ['message' => $this->state('message')])->storeIn('result', 'message')->errorIn('error')),
                Button('Tester le relais')->onClick(Api::post('/api/relay', ['message' => $this->state('message')])->storeIn('result')->errorIn('error')),
                Button('Relais local')->onClick(Api::post('/api/local-relay', ['message' => $this->state('message')])->storeIn('result', 'message')->errorIn('error')),
                Text($this->result)->id('result'),
                Text($this->error)->id('error'),
                Form(
                    TextField('draftName')->id('draft-name'),
                    PasswordInput('secret')->attribute('value', 'synthetic-secret')->id('draft-secret'),
                    HiddenInput('token', 'fresh-synthetic-token')->id('draft-token'),
                    TextField('code')->autocomplete('one-time-code'),
                )->preserve('lab-sensitive'),
            )->gap(20)->style(Style::make()->padding(32)->property('max-width', 800)),
        );
    }
}
